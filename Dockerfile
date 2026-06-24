# ─── Stage 1: Build ───
FROM node:20-slim AS builder

# تثبيت أدوات البناء المطلوبة لـ better-sqlite3 و sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# نسخ ملفات المشروع وثبيت الاعتماديات
COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Runtime ───
FROM node:20-slim

# تثبيت ffmpeg فقط (مطلوب لتحويل الوسائط)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# نسخ node_modules من stage البناء
COPY --from=builder /app/node_modules ./node_modules

# نسخ الكود
COPY . .

# إنشاء مجلدات البيانات
RUN mkdir -p data/temp data/backup data/logs session

# تشغيل البوت
CMD ["node", "index.js"]
