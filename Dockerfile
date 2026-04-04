# ── Build Stage ──
FROM node:25-alpine AS builder
WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --omit=dev

# ── Production Stage ──
FROM node:25-alpine AS runner
WORKDIR /app

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Copy Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Labels
LABEL org.opencontainers.image.title="PaperForge"
LABEL org.opencontainers.image.description="Collaborative LaTeX Editor"
LABEL org.opencontainers.image.source="https://github.com/concrete-sangminlee/paperforge"
LABEL org.opencontainers.image.version="1.0.0"

USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
