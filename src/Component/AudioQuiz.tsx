import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  Alert,
  Anchor,
  Box,
  Button,
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
import { IconInfoCircle, IconPlayerPlayFilled } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

const CORE_JS_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js';
const CORE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm';
const MAX_PLAY_SECONDS = 120;
const EMPTY_CAPTION_SRC = 'data:text/vtt,WEBVTT';

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

export function AudioQuiz() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const limitHandlersRef = useRef<Record<string, () => void>>({});
  const endedHandlersRef = useRef<Record<string, () => void>>({});
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [coreLoaded, { open: markCoreLoaded }] = useDisclosure(false);
  const [coreLoading, { open: startCoreLoading, close: finishCoreLoading }] = useDisclosure(false);
  const [converting, { open: startConverting, close: finishConverting }] = useDisclosure(false);
  const [file, setFile] = useInputState<File | null>(null);
  const [tracks, tracksHandler] = useListState<QuizTrack>([]);
  const [selectedAnswers, setSelectedAnswers] = useInputState<Record<string, QuizTrackQuality | null>>({});
  const [feedback, setFeedback] = useInputState<FeedbackState | null>(null);
  const playingTrackIdRef = useRef<string | null>(null);
  const audioRefCallbacks = useRef<Map<string, (instance: HTMLAudioElement | null) => void>>(new Map());

  useEffect(() => {
    ffmpegRef.current = new FFmpeg();
    return () => {
      for (const [trackId, audio] of Object.entries(audioRefs.current)) {
        if (!audio) {
          continue;
        }
        audio.pause();
        audio.currentTime = 0;
        const limitHandler = limitHandlersRef.current[trackId];
        if (limitHandler) {
          audio.removeEventListener('timeupdate', limitHandler);
        }
        const endedHandler = endedHandlersRef.current[trackId];
        if (endedHandler) {
          audio.removeEventListener('ended', endedHandler);
        }
      }
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
      ffmpegRef.current?.terminate?.();
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
      setFeedback({ text: 'ffmpeg-coreの読み込みが完了しました。', tone: 'success' });
    } catch (error) {
      setFeedback({ text: 'ffmpeg-coreの読み込みに失敗しました。時間をおいて再試行してください。', tone: 'error' });
      console.error(error);
    } finally {
      finishCoreLoading();
    }
  }

  const resetAudioRefs = useCallback(() => {
    for (const [trackId, audio] of Object.entries(audioRefs.current)) {
      if (!audio) {
        continue;
      }
      audio.pause();
      audio.currentTime = 0;
      const limitHandler = limitHandlersRef.current[trackId];
      if (limitHandler) {
        audio.removeEventListener('timeupdate', limitHandler);
      }
      const endedHandler = endedHandlersRef.current[trackId];
      if (endedHandler) {
        audio.removeEventListener('ended', endedHandler);
      }
    }
    audioRefs.current = {};
    limitHandlersRef.current = {};
    endedHandlersRef.current = {};
    playingTrackIdRef.current = null;
    audioRefCallbacks.current.clear();
  }, []);

  const revokeTrackUrls = useCallback(() => {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current.clear();
  }, []);

  async function handleConvert() {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !coreLoaded) {
      setFeedback({ text: 'まずはffmpeg-coreを読み込んでください。', tone: 'error' });
      return;
    }
    if (!file) {
      setFeedback({ text: '音声ファイルを選択してください。', tone: 'error' });
      return;
    }
    startConverting();
    resetAudioRefs();
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
          mime: 'audio/mpeg'
        },
        {
          quality: 'mp3_320',
          outputName: `${baseIdentifier}_320.mp3`,
          command: ['-i', inputName, '-t', String(MAX_PLAY_SECONDS), '-c:a', 'libmp3lame', '-b:a', '320k'],
          mime: 'audio/mpeg'
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
        const blob = new Blob([data.buffer], { type: plan.mime });
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
      setFeedback({ text: '変換が完了しました。曲を再生して当ててみましょう。', tone: 'success' });
    } catch (error) {
      console.error(error);
      setFeedback({ text: '音声変換に失敗しました。別のファイルでお試しください。', tone: 'error' });
    } finally {
      try {
        const ffmpeg = ffmpegRef.current;
        if (ffmpeg) {
          const tempFiles = await ffmpeg.listDir('.');
          for (const item of tempFiles.files) {
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

  function handlePlay(trackId: string) {
    const target = audioRefs.current[trackId];
    if (!target) {
      return;
    }
    const isSame = playingTrackIdRef.current === trackId;
    for (const [id, audio] of Object.entries(audioRefs.current)) {
      if (!audio) {
        continue;
      }
      if (id !== trackId || isSame) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
    if (isSame) {
      playingTrackIdRef.current = null;
      return;
    }
    playingTrackIdRef.current = trackId;
    target.currentTime = 0;
    void target.play().catch((error) => {
      console.error(error);
      playingTrackIdRef.current = null;
      setFeedback({ text: '音声の再生に失敗しました。もう一度お試しください。', tone: 'error' });
    });
  }

  function getAudioRef(trackId: string) {
    const existing = audioRefCallbacks.current.get(trackId);
    if (existing) {
      return existing;
    }

    const callback = (instance: HTMLAudioElement | null) => {
      const previous = audioRefs.current[trackId];
      if (previous === instance) {
        return;
      }
      if (previous) {
        previous.pause();
        previous.currentTime = 0;
        const previousLimitHandler = limitHandlersRef.current[trackId];
        if (previousLimitHandler) {
          previous.removeEventListener('timeupdate', previousLimitHandler);
        }
        const previousEndedHandler = endedHandlersRef.current[trackId];
        if (previousEndedHandler) {
          previous.removeEventListener('ended', previousEndedHandler);
        }
      }
      if (!instance) {
        delete audioRefs.current[trackId];
        delete limitHandlersRef.current[trackId];
        delete endedHandlersRef.current[trackId];
        if (playingTrackIdRef.current === trackId) {
          playingTrackIdRef.current = null;
        }
        audioRefCallbacks.current.delete(trackId);
        return;
      }
      const limitHandler = () => {
        if (instance.currentTime >= MAX_PLAY_SECONDS) {
          instance.pause();
          instance.currentTime = 0;
          if (playingTrackIdRef.current === trackId) {
            playingTrackIdRef.current = null;
          }
        }
      };
      const endedHandler = () => {
        instance.currentTime = 0;
        if (playingTrackIdRef.current === trackId) {
          playingTrackIdRef.current = null;
        }
      };
      instance.addEventListener('timeupdate', limitHandler);
      instance.addEventListener('ended', endedHandler);
      audioRefs.current[trackId] = instance;
      limitHandlersRef.current[trackId] = limitHandler;
      endedHandlersRef.current[trackId] = endedHandler;
    };

    audioRefCallbacks.current.set(trackId, callback);
    return callback;
  }

  function handleAnswerChange(trackId: string, value: string | null) {
    if (!value) {
      setSelectedAnswers((current) => ({ ...current, [trackId]: null }));
      return;
    }
    setSelectedAnswers((current) => ({ ...current, [trackId]: value as QuizTrackQuality }));
  }

  function checkAnswers() {
    if (tracks.length === 0) {
      setFeedback({ text: 'まずは音声を変換してください。', tone: 'error' });
      return;
    }
    const unanswered = tracks.some((track) => !selectedAnswers[track.id]);
    if (unanswered) {
      setFeedback({ text: 'すべての曲で推測を選択してください。', tone: 'error' });
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
    <Box pos='relative'>
      <LoadingOverlay visible={coreLoading || converting} />
      <Stack gap='xl'>
        <Stack gap='xs' ta='center'>
          <Title order={1}>音質当てクイズ</Title>
          <Text c='gray.7'>
            好きな音楽をアップロードして、音質の違いを当ててみましょう（再生は最大{MAX_PLAY_SECONDS}秒まで）。
          </Text>
        </Stack>
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
        <Paper withBorder p='lg' radius='md'>
          <Stack gap='md'>
            <Button onClick={loadCore} disabled={coreLoaded} variant='filled' color='blue' mx='auto' maw={240}>
              {coreLoaded ? 'ffmpeg-core読み込み済み' : 'ffmpeg-coreを読み込む'}
            </Button>
            <FileInput
              label='音声ファイル'
              placeholder='音声ファイルを選択'
              accept='audio/*'
              value={file}
              onChange={setFile}
              withAsterisk
            />
            <Button
              onClick={handleConvert}
              disabled={!coreLoaded || !file}
              variant='filled'
              color='blue'
              mx='auto'
              maw={240}
            >
              変換
            </Button>
          </Stack>
        </Paper>
        {tracks.length > 0 ? (
          <Paper withBorder p='lg' radius='md'>
            <Stack gap='lg'>
              {tracks.map((track, index) => (
                <Stack key={track.id} gap='xs'>
                  <Group>
                    <Button
                      leftSection={<IconPlayerPlayFilled size={18} />}
                      variant='light'
                      color='blue'
                      onClick={() => handlePlay(track.id)}
                    >
                      {`曲${index + 1}を再生`}
                    </Button>
                    <Select
                      placeholder='▼選択'
                      data={QUALITY_OPTIONS}
                      value={selectedAnswers[track.id] ?? null}
                      onChange={(value) => handleAnswerChange(track.id, value)}
                      maw={200}
                    />
                  </Group>
                  <audio ref={getAudioRef(track.id)} src={track.url} preload='auto'>
                    <track kind='captions' label='空字幕' src={EMPTY_CAPTION_SRC} srcLang='ja' default />
                  </audio>
                </Stack>
              ))}
              <Button onClick={checkAnswers} variant='filled' color='blue' mx='auto' maw={240}>
                解答チェック
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper withBorder p='lg' radius='md'>
            <Stack gap='xs'>
              <Text c='gray.7'>変換が完了すると、ここに3つの音源が表示されます。</Text>
              <Text c='gray.6' fz='sm'>
                ffmpeg.wasmについて詳しく知りたい方は
                <Anchor href='https://ffmpegwasm.netlify.app/docs/overview' target='_blank' rel='noreferrer'>
                  こちら
                </Anchor>
                をご覧ください。
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

export default AudioQuiz;
