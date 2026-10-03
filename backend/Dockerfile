# Build context is the REPO ROOT, not backend/ — see docker-compose.prod.yaml.
# This is required so this image can
# COPY shared/, which backend/src/utils/jwt.js and
# backend/src/validators/student.validator.js both depend on (see the
# comments in those files for why the logic lives outside backend/ at all).
# All COPY paths below are written relative to the repo root accordingly.

# deps stage — installs only production dependencies so the runtime image
# never carries devDependencies or the npm cache.
FROM node:22-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node backend/package*.json ./
COPY --chown=node:node backend/src ./src
COPY --chown=node:node backend/docs ./docs
COPY --chown=node:node shared /shared
RUN mkdir -p uploads && chown -R node:node uploads
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
