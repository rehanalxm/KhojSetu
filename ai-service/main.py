from fastapi import FastAPI, UploadFile, File
import uvicorn
from PIL import Image
import io
from sentence_transformers import SentenceTransformer

app = FastAPI()

# Load model (will download on first run)
model = SentenceTransformer('clip-ViT-B-32')

@app.get("/")
def read_root():
    return {"message": "AI Service Online"}

@app.post("/embed")
async def generate_embedding(file: UploadFile = File(...)):
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data))
    
    # Generate embedding
    embedding = model.encode(image)
    
    return {"vector": embedding.tolist(), "message": "Embedding generated"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
