import { createClienteMirrorScreen } from '@/screens/createClienteMirrorScreen';

export default createClienteMirrorScreen({
  route: '/onboarding',
  sourceFile: 'cliente/pages/onboarding/index.vue',
  layout: 'onboarding',
  middleware: ["patient-onboarding"],
});
