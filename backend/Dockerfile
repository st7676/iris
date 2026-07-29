# שימוש בתמונת פייתון רשמית וקלה
FROM python:3.11-slim

# הגדרת תיקיית העבודה בתוך הקונטיינר
WORKDIR /app

# התקנת תלויות מערכת נדרשות (עבור psycopg2 וספריות נוספות אם ידרשו)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# הערה: ה-build context עבר ל-repo root (ראו docker-compose.yml) כדי
# שנוכל להעתיק גם את ai_services/ -- ה-Backend מייבא ממנו ישירות
# (app/core/ai_bridge.py), אז הוא חייב להיות זמין בתוך האימג'.

# התקנת דרישות משני הפרויקטים
COPY backend/requirements.txt ./requirements.txt
COPY ai_services/requirements.txt ./ai_services-requirements.txt
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org \
    -r requirements.txt -r ai_services-requirements.txt

# העתקת קוד ה-Backend ותיקיית ai_services (בנתיב קבוע, שה-ai_bridge יודע למצוא)
COPY backend/ .
COPY ai_services/ /ai_services
ENV AI_SERVICES_PATH=/ai_services

# חשיפת הפורט שבו ירוץ השרת
EXPOSE 8000

# פקודת ההרצה של השרת באמצעות uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]