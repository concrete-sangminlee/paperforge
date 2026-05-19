import { defineConfig } from 'prisma/config';
import { getPrismaDatabaseUrl } from './src/env';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: getPrismaDatabaseUrl(),
  },
});
