import { defineConfig } from 'prisma/config';
import { getPrismaDatabaseUrl } from './prisma/env';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: getPrismaDatabaseUrl(),
  },
});
