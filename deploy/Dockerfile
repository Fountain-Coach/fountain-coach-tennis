FROM node:22-bookworm-slim
WORKDIR /srv/tennis/app
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY app/ ./
ENV NODE_ENV=development PORT=8787 TENNIS_STATE_BACKEND=sqlite TENNIS_SQLITE_FILE=/var/lib/tennis/tennis.sqlite TENNIS_AUDIT_FILE=/var/lib/tennis/audit.jsonl
EXPOSE 8787
CMD ["node", "mcp-server.mjs"]
