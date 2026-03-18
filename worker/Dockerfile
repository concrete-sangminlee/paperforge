FROM ubuntu:22.04

# Install Node.js 20 and TeX Live
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
    texlive-base texlive-latex-base texlive-latex-recommended \
    texlive-latex-extra texlive-fonts-recommended texlive-fonts-extra \
    texlive-science texlive-bibtex-extra texlive-xetex texlive-luatex \
    latexmk biber \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY dist ./dist/

CMD ["node", "dist/index.js"]
