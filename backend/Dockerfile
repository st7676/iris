# שימוש בתמונת פייתון רשמית וקלה
FROM python:3.11-slim

# הגדרת תיקיית העבודה בתוך הקונטיינר
WORKDIR /app

# התקנת תלויות מערכת נדרשות (עבור psycopg2 וספריות נוספות אם ידרשו)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# העתקת קובץ הדרישות והתקנת הספריות
COPY requirements.txt .
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
# העתקת כל שאר קודי ה-Backend לתוך תיקיית העבודה
COPY . .

# חשיפת הפורט שבו ירוץ השרת
EXPOSE 8000

# פקודת ההרצה של השרת באמצעות uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]