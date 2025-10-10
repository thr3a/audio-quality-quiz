import { FFmpeg, type LogEvent } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  FileInput,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  Stack,
  Text,
  Title
} from '@mantine/core';
import { useDisclosure, useInputState, useListState } from '@mantine/hooks';
import { IconInfoCircle, IconPlayerPlayFilled, IconPlayerStopFilled } from '@tabler/icons-react';
import type { Howl } from 'howler';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSound from 'use-sound';

const FF_CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
const CORE_JS_URL = `${FF_CORE_BASE_URL}/ffmpeg-core.js`;
const CORE_WASM_URL = `${FF_CORE_BASE_URL}/ffmpeg-core.wasm`;
const MAX_PLAY_SECONDS = 120;

type QuizTrackQuality = 'mp3_128' | 'mp3_320' | 'original';

type QuizTrack = {
  id: string;
  quality: QuizTrackQuality;
  fileName: string;
  url: string;
};

type FeedbackState = {
  text: string;
  tone: 'success' | 'error';
};

const QUALITY_OPTIONS: Array<{ value: QuizTrackQuality; label: string }> = [
  { value: 'mp3_128', label: 'mp3 128K' },
  { value: 'mp3_320', label: 'mp3 320K' },
  { value: 'original', label: 'オリジナル' }
];

const QUALITY_LABEL_MAP: Record<QuizTrackQuality, string> = {
  mp3_128: 'mp3 128K',
  mp3_320: 'mp3 320K',
  original: 'オリジナル'
};

function createTrackId(base: string, quality: QuizTrackQuality): string {
  return `${base}-${quality}`;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

// 各トラックの再生を管理するコンポーネント
type AudioTrackPlayerProps = {
  track: QuizTrack;
  index: number;
  isPlaying: boolean;
  selectedAnswer: QuizTrackQuality | null;
  onPlay: () => void;
  onStop: () => void;
  onSoundUpdate: (trackId: string, sound: Howl | null) => void;
  onAnswerChange: (value: string | null) => void;
};

function AudioTrackPlayer({
  track,
  index,
  isPlaying,
  selectedAnswer,
  onPlay,
  onStop,
  onSoundUpdate,
  onAnswerChange
}: AudioTrackPlayerProps) {
  const [play, { stop, sound }] = useSound(track.url, {
    format: ['mp3', 'wav'],
    html5: true, // BlobURLの場合はHTML5モードを使用
    onend: () => {
      onStop();
    },
    onloaderror: (_id: unknown, error: unknown) => {
      console.error('Sound load error:', error);
    },
    onplayerror: (_id: unknown, error: unknown) => {
      console.error('Sound play error:', error);
    }
  });

  const { id: trackId } = track;

  useEffect(() => {
    if (isPlaying && sound) {
      onSoundUpdate(trackId, sound);
      return;
    }
    onSoundUpdate(trackId, null);
  }, [isPlaying, onSoundUpdate, sound, trackId]);

  const handlePlayClick = () => {
    if (isPlaying) {
      stop();
      onStop();
    } else {
      play();
      onPlay();
    }
  };

  return (
    <Stack gap='xs'>
      <Group>
        <Button
          leftSection={isPlaying ? <IconPlayerStopFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
          variant={isPlaying ? 'filled' : 'light'}
          onClick={handlePlayClick}
        >
          {isPlaying ? `曲${index + 1}を停止` : `曲${index + 1}を再生`}
        </Button>
        <Select
          placeholder='▼選択'
          data={QUALITY_OPTIONS}
          value={selectedAnswer ?? null}
          onChange={onAnswerChange}
          maw={200}
        />
      </Group>
    </Stack>
  );
}

export function AudioQuiz() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [coreLoaded, { open: markCoreLoaded }] = useDisclosure(false);
  const [coreLoading, { open: startCoreLoading, close: finishCoreLoading }] = useDisclosure(false);
  const [converting, { open: startConverting, close: finishConverting }] = useDisclosure(false);
  const [file, setFile] = useInputState<File | null>(null);
  const [tracks, tracksHandler] = useListState<QuizTrack>([]);
  const [selectedAnswers, setSelectedAnswers] = useInputState<Record<string, QuizTrackQuality | null>>({});
  const [feedback, setFeedback] = useInputState<FeedbackState | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  // 再生中のトラックごとのHowlインスタンスを記録するリファレンス
  const soundMapRef = useRef<Record<string, Howl | null>>({});

  useEffect(() => {
    const ffmpeg = new FFmpeg();
    const logHandler = ({ message }: LogEvent) => {
      console.log(message);
    };
    ffmpeg.on('log', logHandler);
    ffmpegRef.current = ffmpeg;
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
      ffmpeg.off('log', logHandler);
      ffmpeg.terminate();
      ffmpegRef.current = null;
    };
  }, []);

  const baseFileName = useMemo(() => {
    if (!file) {
      return 'upload';
    }
    const dotIndex = file.name.lastIndexOf('.');
    return dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
  }, [file]);

  const originalExtension = useMemo(() => {
    if (!file) {
      return 'orig';
    }
    const dotIndex = file.name.lastIndexOf('.');
    return dotIndex > 0 ? file.name.slice(dotIndex + 1) : 'orig';
  }, [file]);

  function getMimeByQuality(quality: QuizTrackQuality, originalType: string): string {
    if (quality === 'original') {
      return originalType || 'audio/mpeg';
    }
    return 'audio/mpeg';
  }

  async function loadCore() {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || coreLoaded) {
      return;
    }
    startCoreLoading();
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(CORE_JS_URL, 'text/javascript'),
        wasmURL: await toBlobURL(CORE_WASM_URL, 'application/wasm')
      });
      markCoreLoaded();
      // setFeedback({ text: 'ffmpeg-coreの読み込みが完了しました。', tone: 'success' });
    } catch (error) {
      setFeedback({ text: 'ffmpeg-coreの読み込みに失敗しました。時間をおいて再試行してください。', tone: 'error' });
      console.error(error);
    } finally {
      finishCoreLoading();
    }
  }

  const resetPlayingState = useCallback(() => {
    setPlayingTrackId(null);
    soundMapRef.current = {};
  }, []);

  const revokeTrackUrls = useCallback(() => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current.clear();
  }, []);

  const handleSoundUpdate = useCallback((trackId: string, sound: Howl | null) => {
    soundMapRef.current[trackId] = sound;
  }, []);

  async function handleConvert() {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !coreLoaded) {
      setFeedback({ text: 'まずはFFmpegを読み込んでください。', tone: 'error' });
      return;
    }
    if (!file) {
      setFeedback({ text: '楽曲を選択してください。', tone: 'error' });
      return;
    }
    startConverting();
    resetPlayingState();
    revokeTrackUrls();
    tracksHandler.setState([]);
    const baseIdentifier = `${baseFileName}_${Date.now()}`;
    try {
      const inputName = `${baseIdentifier}_input.${originalExtension}`;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const outputPlans: Array<{
        quality: QuizTrackQuality;
        outputName: string;
        command: string[];
        mime: string;
      }> = [
        {
          quality: 'mp3_128',
          outputName: `${baseIdentifier}_128.mp3`,
          command: ['-i', inputName, '-t', String(MAX_PLAY_SECONDS), '-c:a', 'libmp3lame', '-b:a', '128k'],
          mime: getMimeByQuality('mp3_128', file.type)
        },
        {
          quality: 'mp3_320',
          outputName: `${baseIdentifier}_320.mp3`,
          command: ['-i', inputName, '-t', String(MAX_PLAY_SECONDS), '-c:a', 'libmp3lame', '-b:a', '320k'],
          mime: getMimeByQuality('mp3_320', file.type)
        },
        {
          quality: 'original',
          outputName: `${baseIdentifier}_original.${originalExtension}`,
          command: ['-i', inputName, '-t', String(MAX_PLAY_SECONDS), '-c', 'copy'],
          mime: getMimeByQuality('original', file.type)
        }
      ];

      const preparedTracks: QuizTrack[] = [];
      for (const plan of outputPlans) {
        const args = [...plan.command, plan.outputName];
        await ffmpeg.exec(args);
        const data = await ffmpeg.readFile(plan.outputName);
        const uint8Array = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
        const blob = new Blob([uint8Array], { type: plan.mime });
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.add(url);
        preparedTracks.push({
          id: createTrackId(baseIdentifier, plan.quality),
          quality: plan.quality,
          fileName: plan.outputName,
          url
        });
      }

      const shuffled = shuffle(preparedTracks);
      tracksHandler.setState(shuffled);
      const initialAnswers: Record<string, QuizTrackQuality | null> = {};
      for (const track of shuffled) {
        initialAnswers[track.id] = null;
      }
      setSelectedAnswers(initialAnswers);
      setFeedback({
        text: `変換が完了しました。曲を再生して当ててみよう！(再生は冒頭${MAX_PLAY_SECONDS}秒まで)`,
        tone: 'success'
      });
    } catch (error) {
      console.error(error);
      setFeedback({ text: '音声変換に失敗しました。別のファイルでお試しください。', tone: 'error' });
    } finally {
      try {
        const ffmpeg = ffmpegRef.current;
        if (ffmpeg) {
          const tempFiles = await ffmpeg.listDir('.');
          for (const item of tempFiles) {
            if (item.name.startsWith(baseIdentifier)) {
              ffmpeg.deleteFile?.(item.name);
            }
          }
        }
      } catch (cleanupError) {
        console.warn(cleanupError);
      }
      finishConverting();
    }
  }

  function handleTrackPlay(trackId: string) {
    setPlayingTrackId(trackId);
  }

  function handleTrackStop(trackId: string) {
    handleSoundUpdate(trackId, null);
    setPlayingTrackId((current) => (current === trackId ? null : current));
  }

  const handleSeek = useCallback(
    (offsetSeconds: number) => {
      if (!playingTrackId) {
        return;
      }
      const targetSound = soundMapRef.current[playingTrackId];
      if (!targetSound) {
        return;
      }
      const currentPosition = targetSound.seek() as number;
      const duration = targetSound.duration();
      if (!Number.isFinite(duration)) {
        return;
      }
      const nextPosition = Math.min(Math.max(currentPosition + offsetSeconds, 0), duration);
      targetSound.seek(nextPosition);
    },
    [playingTrackId]
  );

  function handleAnswerChange(trackId: string, value: string | null) {
    if (!value) {
      setSelectedAnswers({ ...selectedAnswers, [trackId]: null });
      return;
    }
    setSelectedAnswers({ ...selectedAnswers, [trackId]: value as QuizTrackQuality });
  }

  function checkAnswers() {
    if (tracks.length === 0) {
      setFeedback({ text: 'まずは曲を変換してください。', tone: 'error' });
      return;
    }
    const unanswered = tracks.some((track) => !selectedAnswers[track.id]);
    if (unanswered) {
      setFeedback({ text: 'すべての曲で予想を選択してください。', tone: 'error' });
      return;
    }
    let correct = 0;
    const details: string[] = [];
    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      const answer = selectedAnswers[track.id];
      const isCorrect = answer === track.quality;
      if (isCorrect) {
        correct += 1;
      }
      const label = `曲${index + 1}`;
      const actual = QUALITY_LABEL_MAP[track.quality];
      const guessed = answer ? QUALITY_LABEL_MAP[answer] : '未選択';
      details.push(`${label}: 正解 ${actual} / あなたの選択 ${guessed}`);
    }
    const message = [`${tracks.length}問中${correct}問正解でした。`, ...details].join('\n');
    setFeedback({
      text: message,
      tone: correct === tracks.length ? 'success' : 'error'
    });
  }

  return (
    <Box>
      <LoadingOverlay visible={coreLoading || converting} />
      <Stack gap='lg'>
        <Box>
          <Anchor href='/'>
            <Title order={2}>音質当てクイズ</Title>
          </Anchor>
          <Title order={6} c={'dimmed'}>
            自分の楽曲をアップロードして、音質の違いがわかるかチャレンジ！
          </Title>
        </Box>

        <Paper withBorder p='lg'>
          <Stack>
            <Text fw={'bold'}>1. FFmpegのダウンロード</Text>
            <Button onClick={loadCore} disabled={coreLoaded} maw={260}>
              {coreLoaded ? 'ダウンロード済' : 'FFmpegをダウンロード(約30MB)'}
            </Button>
            <Text fw={'bold'}>2. 楽曲ファイルの選択</Text>
            <FileInput placeholder='選択' accept='audio/*' value={file} onChange={setFile} />
            <Center>
              <Button onClick={handleConvert} disabled={!coreLoaded || !file}>
                変換する
              </Button>
            </Center>
          </Stack>
        </Paper>

        {feedback ? (
          <Alert
            icon={<IconInfoCircle size={18} />}
            color={feedback.tone === 'success' ? 'green' : 'red'}
            variant='light'
          >
            <Text component='pre' m={0} style={{ whiteSpace: 'pre-wrap' }}>
              {feedback.text}
            </Text>
          </Alert>
        ) : null}

        {tracks.length > 0 ? (
          <Paper withBorder p='lg'>
            <Stack gap='lg' mb={'xs'}>
              {tracks.map((track, index) => (
                <AudioTrackPlayer
                  key={track.id}
                  track={track}
                  index={index}
                  isPlaying={playingTrackId === track.id}
                  selectedAnswer={selectedAnswers[track.id] ?? null}
                  onPlay={() => handleTrackPlay(track.id)}
                  onStop={() => handleTrackStop(track.id)}
                  onSoundUpdate={handleSoundUpdate}
                  onAnswerChange={(value) => handleAnswerChange(track.id, value)}
                />
              ))}
              <Group justify='center' gap='sm'>
                <Button variant='light' onClick={() => handleSeek(-5)} disabled={!playingTrackId}>
                  5秒戻る
                </Button>
                <Button variant='light' onClick={() => handleSeek(5)} disabled={!playingTrackId}>
                  5秒進む
                </Button>
              </Group>
              <Center>
                <Button onClick={checkAnswers}>解答チェック!</Button>
              </Center>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}

export default AudioQuiz;
