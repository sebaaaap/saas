import shutil
import os
from fastapi import UploadFile
from uuid import uuid4

UPLOAD_DIR = "static/images"

class ImageService:
    @staticmethod
    def save_image(file: UploadFile) -> str:
        # 1. Asegurar directorio
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR)
            
        # 2. Generar nombre único (UUID) + extensión original
        ext = file.filename.split(".")[-1]
        filename = f"{uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # 3. Guardar
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return f"/static/images/{filename}"
