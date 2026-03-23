import buttonDesign from './tui-button.design.json';
import { toStorybookDesign, toStoryDescriptionMarkdown } from '../src/runtime/index.js';

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
