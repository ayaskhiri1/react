from transformers import AutoModel, AutoTokenizer

AutoTokenizer.from_pretrained("sentence-transformers/paraphrase-MiniLM-L6-v2")
AutoModel.from_pretrained("sentence-transformers/paraphrase-MiniLM-L6-v2")
