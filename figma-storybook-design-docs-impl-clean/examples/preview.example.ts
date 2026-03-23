// Example for a consuming Storybook project.
// Replace the catalog import path with the real path in your app.
import catalog from '../path-to-your-app/design/design-catalog.json';
import { initDesignDocs } from '../src/runtime/index.js';

initDesignDocs({
  catalog,
  assetsBaseUrl: '/design-assets/figma'
});
