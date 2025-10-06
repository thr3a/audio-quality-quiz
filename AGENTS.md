# 必ず守ること

- 会話とコード内のコメントは日本語でお願いします。
- コードコメントは日本語で 既存のコードコメントは指示がない限り変えないこと
- 可能な限りReact純正のhookよりmantine hookを利用すること
- 型定義はinterfaceではなくtypeを使用すること
- src/scripts以下のTypyscriptコード実行する場合は `node --import tsx ./src/scripts/hello.ts` とすること 特に指示がなければ許可なく自動実行して良い。

# ライブラリ概要

- 言語: TypeScript
- UI: React v19 Mantine v8
- hook: mantine hook
- lint: biome

# Mantineの色一覧

```
dark.0: #C9C9C9
dark.1: #b8b8b8
dark.2: #828282
dark.3: #696969
dark.4: #424242
dark.5: #3b3b3b
dark.6: #2e2e2e
dark.7: #242424
dark.8: #1f1f1f
dark.9: #141414
gray.0: #f8f9fa
gray.1: #f1f3f5
gray.2: #e9ecef
gray.3: #dee2e6
gray.4: #ced4da
gray.5: #adb5bd
gray.6: #868e96
gray.7: #495057
gray.8: #343a40
gray.9: #212529
red.0: #fff5f5
red.1: #ffe3e3
red.2: #ffc9c9
red.3: #ffa8a8
red.4: #ff8787
red.5: #ff6b6b
red.6: #fa5252
red.7: #f03e3e
red.8: #e03131
red.9: #c92a2a
pink.0: #fff0f6
pink.1: #ffdeeb
pink.2: #fcc2d7
pink.3: #faa2c1
pink.4: #f783ac
pink.5: #f06595
pink.6: #e64980
pink.7: #d6336c
pink.8: #c2255c
pink.9: #a61e4d
grape.0: #f8f0fc
grape.1: #f3d9fa
grape.2: #eebefa
grape.3: #e599f7
grape.4: #da77f2
grape.5: #cc5de8
grape.6: #be4bdb
grape.7: #ae3ec9
grape.8: #9c36b5
grape.9: #862e9c
violet.0: #f3f0ff
violet.1: #e5dbff
violet.2: #d0bfff
violet.3: #b197fc
violet.4: #9775fa
violet.5: #845ef7
violet.6: #7950f2
violet.7: #7048e8
violet.8: #6741d9
violet.9: #5f3dc4
indigo.0: #edf2ff
indigo.1: #dbe4ff
indigo.2: #bac8ff
indigo.3: #91a7ff
indigo.4: #748ffc
indigo.5: #5c7cfa
indigo.6: #4c6ef5
indigo.7: #4263eb
indigo.8: #3b5bdb
indigo.9: #364fc7
blue.0: #e7f5ff
blue.1: #d0ebff
blue.2: #a5d8ff
blue.3: #74c0fc
blue.4: #4dabf7
blue.5: #339af0
blue.6: #228be6
blue.7: #1c7ed6
blue.8: #1971c2
blue.9: #1864ab
cyan.0: #e3fafc
cyan.1: #c5f6fa
cyan.2: #99e9f2
cyan.3: #66d9e8
cyan.4: #3bc9db
cyan.5: #22b8cf
cyan.6: #15aabf
cyan.7: #1098ad
cyan.8: #0c8599
cyan.9: #0b7285
teal.0: #e6fcf5
teal.1: #c3fae8
teal.2: #96f2d7
teal.3: #63e6be
teal.4: #38d9a9
teal.5: #20c997
teal.6: #12b886
teal.7: #0ca678
teal.8: #099268
teal.9: #087f5b
green.0: #ebfbee
green.1: #d3f9d8
green.2: #b2f2bb
green.3: #8ce99a
green.4: #69db7c
green.5: #51cf66
green.6: #40c057
green.7: #37b24d
green.8: #2f9e44
green.9: #2b8a3e
lime.0: #f4fce3
lime.1: #e9fac8
lime.2: #d8f5a2
lime.3: #c0eb75
lime.4: #a9e34b
lime.5: #94d82d
lime.6: #82c91e
lime.7: #74b816
lime.8: #66a80f
lime.9: #5c940d
yellow.0: #fff9db
yellow.1: #fff3bf
yellow.2: #ffec99
yellow.3: #ffe066
yellow.4: #ffd43b
yellow.5: #fcc419
yellow.6: #fab005
yellow.7: #f59f00
yellow.8: #f08c00
yellow.9: #e67700
orange.0: #fff4e6
orange.1: #ffe8cc
orange.2: #ffd8a8
orange.3: #ffc078
orange.4: #ffa94d
orange.5: #ff922b
orange.6: #fd7e14
orange.7: #f76707
orange.8: #e8590c
orange.9: #d9480f
```

# Mantineで使用可能なStyle props

All Mantine components that have root element support the following style props:

| Prop    | CSS Property         | Theme key         | 
| ------- | -------------------- | ----------------- | 
| m       | margin               | theme.spacing     | 
| mt      | marginTop            | theme.spacing     | 
| mb      | marginBottom         | theme.spacing     | 
| ml      | marginLeft           | theme.spacing     | 
| mr      | marginRight          | theme.spacing     | 
| ms      | marginInlineStart    | theme.spacing     | 
| me      | marginInlineEnd      | theme.spacing     | 
| mx      | marginInline         | theme.spacing     | 
| my      | marginBlock          | theme.spacing     | 
| p       | padding              | theme.spacing     | 
| pt      | paddingTop           | theme.spacing     | 
| pb      | paddingBottom        | theme.spacing     | 
| pl      | paddingLeft          | theme.spacing     | 
| pr      | paddingRight         | theme.spacing     | 
| ps      | paddingInlineStart   | theme.spacing     | 
| pe      | paddingInlineEnd     | theme.spacing     | 
| px      | paddingInline        | theme.spacing     | 
| py      | paddingBlock         | theme.spacing     | 
| bd      | border               | –                | 
| bg      | background           | theme.colors      | 
| c       | color                | –                | 
| opacity | opacity              | –                | 
| ff      | fontFamily           | –                | 
| fz      | fontSize             | theme.fontSizes   | 
| fw      | fontWeight           | –                | 
| lts     | letterSpacing        | –                | 
| ta      | textAlign            | –                | 
| lh      | lineHeight           | theme.lineHeights | 
| fs      | fontStyle            | –                | 
| tt      | textTransform        | –                | 
| td      | textDecoration       | –                | 
| w       | width                | theme.spacing     | 
| miw     | minWidth             | theme.spacing     | 
| maw     | maxWidth             | theme.spacing     | 
| h       | height               | theme.spacing     | 
| mih     | minHeight            | theme.spacing     | 
| mah     | maxHeight            | theme.spacing     | 
| bgsz    | backgroundSize       | –                | 
| bgp     | backgroundPosition   | –                | 
| bgr     | backgroundRepeat     | –                | 
| bga     | backgroundAttachment | –                | 
| pos     | position             | –                | 
| top     | top                  | –                | 
| left    | left                 | –                | 
| bottom  | bottom               | –                | 
| right   | right                | –                | 
| inset   | inset                | –                | 
| display | display              | –                | 
| flex    | flex                 | –                | 

# Mantineサンプルフォーム

```tsx
// https://mantine.dev/form/validators/
// https://mantine.dev/form/create-form-context/

import { Button, Group, NumberInput, TextInput } from '@mantine/core';
import { hasLength, isEmail, isInRange, isNotEmpty, matches } from '@mantine/form';
import { createFormContext } from '@mantine/form';

// Definition of form values is required
type formProps = {
  name: string;
  job: string;
  email: string;
  favoriteColor: string;
  age: number;
};

// createFormContext returns a tuple with 3 items:
// FormProvider is a component that sets form context
// useFormContext hook return form object that was previously set in FormProvider
// useForm hook works the same way as useForm exported from the package but has predefined type
const [FormProvider, useFormContext, useForm] = createFormContext<formProps>();

function NameField() {
  const form = useFormContext();
  return <TextInput label='Name' placeholder='Name' withAsterisk {...form.getInputProps('name')} />;
}

export function SampleForm() {
  // Create form as described in use-form documentation
  const form = useForm({
    mode: 'controlled',
    initialValues: {
      name: '',
      job: '',
      email: '',
      favoriteColor: '',
      age: 18
    },

    validate: {
      name: hasLength({ min: 2, max: 10 }, '名前は2〜10文字で入力してください'),
      job: isNotEmpty('現在の職業を入力してください'),
      email: isEmail('有効なメールアドレスを入力してください'),
      favoriteColor: matches(/^#([0-9a-f]{3}){1,2}$/, '有効な16進数カラーコードを入力してください'),
      age: isInRange({ min: 18, max: 99 }, '登録するには18〜99歳である必要があります')
    }
  });

  function handleSubmit(): void {
    console.log(form.values.name);
  }

  return (
    // Wrap your form with FormProvider
    <FormProvider form={form}>
      <form
        onSubmit={form.onSubmit(() => {
          handleSubmit();
        })}
      >
        <NameField />
        <TextInput label='職業' placeholder='あなたの職業' withAsterisk mt='md' {...form.getInputProps('job')} />
        <TextInput
          label='メールアドレス'
          placeholder='あなたのメールアドレス'
          withAsterisk
          mt='md'
          {...form.getInputProps('email')}
        />
        <TextInput
          label='好きな色'
          placeholder='あなたの好きな色'
          withAsterisk
          mt='md'
          {...form.getInputProps('favoriteColor')}
        />
        <NumberInput label='年齢' placeholder='あなたの年齢' withAsterisk mt='md' {...form.getInputProps('age')} />

        <Group justify='flex-end' mt='md'>
          <Button type='submit'>送信</Button>
          <Button onClick={() => form.reset()}>Reset to initial values</Button>
        </Group>
      </form>
    </FormProvider>
  );
}
```
