# Figma Storybook Design Docs

Небольшой пакет под схему:
- `design-catalog.json` — общий snapshot Figma
- reusable `*.design.json` — куски design-конфигурации
- `toStorybookDesign(...)` — данные для `@storybook/addon-designs`
- `toStoryDescriptionMarkdown(...)` — markdown для `parameters.docs.description.story`
- `design-sync` — отдельный sync-скрипт для скриншотов

## Что вручную лежит в проекте

- `src/design/design-catalog.json`
- `src/design/fragments/**/*.design.json`
- `public/design-assets/figma/...`

## Инициализация в `.storybook/preview.ts`

Ниже пример для вашего Storybook-проекта, а не для содержимого этого архива.

```ts
import catalog from '../src/design/design-catalog.json';
import { initDesignDocs } from '../src/runtime';

initDesignDocs({
  catalog,
  assetsBaseUrl: '/design-assets/figma'
});
```

`catalog` импортируется только здесь. В story-файлах его подключать не нужно.

## Использование в story

```ts
import buttonDesign from '../design/fragments/tui-button.design.json';
import { toStorybookDesign, toStoryDescriptionMarkdown } from '../design/runtime';

export default {
  title: 'TUI/Button',
  parameters: {
    design: toStorybookDesign([buttonDesign]),
    docs: {
      description: {
        story: toStoryDescriptionMarkdown([buttonDesign])
      }
    }
  }
};
```

## Формат `*.design.json`

```json
{
  "$schema": "../../schemas/design.schema.json",
  "refs": [
    {
      "ref": "figma://kit123/10:20",
      "view": "expanded",
      "screenshots": "none",
      "children": "all",
      "panel": true,
      "label": "Button family"
    },
    {
      "ref": "https://www.figma.com/file/FILE_KEY/?node-id=10-21",
      "view": "collapsed",
      "screenshots": "link",
      "children": "none"
    }
  ]
}
```

### Поля

- `ref` — Figma URL или `figma://FILE_KEY/NODE_ID`
- `view` — `link | collapsed | expanded`
- `screenshots` — `none | link | embed`
- `children` — `none | mapped | all`
- `panel` — кандидат для `parameters.design`
- `label` — подпись в markdown
- `imageFormat` — `png | svg`

## Что делает `toStorybookDesign(...)`

Возвращает один объект для `parameters.design` в формате, который понимает `@storybook/addon-designs`:

```ts
{ type: 'figma', url: '...' }
```

Берёт первый ref с `panel: true`, а если его нет — первый ref из конфигов.

## Что делает `toStoryDescriptionMarkdown(...)`

Строит markdown для `parameters.docs.description.story`:
- ссылки на Figma
- ссылки на локальные скриншоты
- inline image для `screenshots: "embed"`
- текстовый fallback через Figma-link, если локальный screenshot не подготовлен
- properties / variants / children по данным из `design-catalog.json`

## Sync

Sync не читает story-файлы. Он смотрит только на:
- `design-catalog.json`
- все `*.design.json`
- файловую систему `public/design-assets/figma`

Команда:

```bash
FIGMA_TOKEN=... node --loader ts-node/esm src/cli/design-sync.ts scripts/design-sync.config.json
```

Что он делает:
1. собирает все `*.design.json`
2. строит список нужных screenshots
3. проверяет наличие файлов
4. докачивает только недостающее

## Важные ограничения текущей версии

- нет manifest/fingerprint
- нет проверки устаревания screenshots
- `COMPONENT_SET` сам по себе не скриншотится; для него screenshots идут через children
- runtime markdown не проверяет наличие файла на диске заранее — он строит deterministic URL и всегда добавляет Figma fallback
