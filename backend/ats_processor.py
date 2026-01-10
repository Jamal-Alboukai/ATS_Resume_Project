import os
import json
import re  # <--- NEW: Required for regex extraction
from datetime import datetime
from typing import Optional, Dict, Any, List

import pdfplumber
import docx2txt

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


class ATSProcessor:
    """Lightweight ATS processor with optional OpenAI-powered analysis."""

    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key) if api_key and OpenAI else None

    # ===================== PUBLIC API =====================

    def analyze_resume(
        self,
        file_path: str,
        job_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extract text, run AI (if configured), and return structured analysis."""
        text = self._extract_text(file_path)

        # --- NEW: Extract Basic Info immediately using Heuristics ---
        # This ensures we have Name/Email even if AI fails or isn't used.
        extracted_name = self._extract_name_heuristic(text)
        extracted_email = self._extract_email_regex(text)
        extracted_phone = self._extract_phone_regex(text)
        # -----------------------------------------------------------

        if not text.strip():
            return self._simple_fallback_analysis(
                resume_text="",
                job_description=job_description,
                error="Could not extract text from resume",
                name="Unknown", email="", phone=""
            )

        try:
            if self.client:
                # If we have OpenAI, we try that.
                # Note: The AI usually extracts name/email well, but you could 
                # merge the heuristic values if you wanted to be double-sure.
                return self._analyze_with_openai(text, job_description)
        except Exception as exc:
            # If OpenAI fails, fall back to a lightweight analysis
            return self._simple_fallback_analysis(
                resume_text=text,
                job_description=job_description,
                error=str(exc),
                name=extracted_name,    # Pass the extracted name
                email=extracted_email,  # Pass the extracted email
                phone=extracted_phone
            )

        # No AI client available, use fallback
        return self._simple_fallback_analysis(
            resume_text=text, 
            job_description=job_description,
            name=extracted_name,    # Pass the extracted name
            email=extracted_email,  # Pass the extracted email
            phone=extracted_phone
        )

    # ===================== TEXT EXTRACTION =====================

    def _extract_text(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            return self._extract_from_pdf(file_path)
        if ext in (".docx", ".doc"):
            return self._extract_from_docx(file_path)

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""

    def _extract_from_pdf(self, file_path: str) -> str:
        try:
            text_parts: List[str] = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    # 'keep_blank_chars' helps preserve layout for name detection
                    page_text = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
                    text_parts.append(page_text)
            return "\n".join(text_parts)
        except Exception:
            return ""

    def _extract_from_docx(self, file_path: str) -> str:
        try:
            return docx2txt.process(file_path) or ""
        except Exception:
            return ""

    # ===================== HEURISTIC EXTRACTION HELPERS (NEW) =====================

    def _extract_email_regex(self, text: str) -> str:
        # 1. Standard regex
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        match = re.search(email_pattern, text)
        if match:
            return match.group(0)

        # 2. Cleaned regex (handles "j o h n @ g m a i l . c o m" PDF issues)
        clean_text = text.replace(" ", "")
        match = re.search(email_pattern, clean_text)
        if match:
            return match.group(0)
        
        return ""

    def _extract_phone_regex(self, text: str) -> str:
        # Matches formats like +1-555-555-5555, (555) 555-5555, 555 555 5555
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}'
        match = re.search(phone_pattern, text)
        return match.group(0) if match else ""

    def _extract_name_heuristic(self, text: str) -> str:
        lines = text.split('\n')
        lines = [line.strip() for line in lines if line.strip()]
        
        # Words to ignore if found in the first line
        skip_words = ["resume", "cv", "curriculum", "vitae", "profile", "contact", "summary", "page", "phone", "email"]
        
        # Check first 10 lines
        for line in lines[:10]:
            lower_line = line.lower()
            
            # 1. Skip metadata lines
            if any(word in lower_line for word in skip_words):
                continue
            
            # 2. Skip emails or phone numbers
            if "@" in line or re.search(r'\d{3,}', line):
                continue
                
            # 3. Validation: Name usually has 2-4 words, mostly capitalized
            words = line.split()
            if 2 <= len(words) <= 4:
                # Check for Title Case (allowing some flexibility)
                if all(w[0].isupper() for w in words if w.isalpha()):
                     return line
                     
        return "Unknown"

    # ===================== ANALYSIS (OPENAI) =====================

    def _analyze_with_openai(
        self,
        resume_text: str,
        job_description: Optional[str],
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are an ATS (Applicant Tracking System) assistant. "
            "You analyze resumes and (optionally) a job description and return "
            "structured JSON with scores and insights."
        )

        user_prompt = {
            "resume_text": resume_text[:8000],
            "job_description": job_description or "",
            "instructions": (
                "Return STRICT JSON ONLY with this top-level schema:\n"
                "{\n"
                '  "overallScore": int (0-100),\n'
                '  "personalInfo": {\n'
                '    "name": string,\n'
                '    "email": string,\n'
                '    "phone": string,\n'
                '    "location": string\n'
                "  },\n"
                '  "skills": [\n'
                '    {"name": string, "confidence": float 0-1, "category": string}\n'
                "  ],\n"
                '  "sections": [\n'
                '    {"name": string, "score": int}\n'
                "  ],\n"
                '  "experience": {\n'
                '    "totalYears": int,\n'
                '    "positions": [\n'
                '      {"title": string, "company": string, "duration": string, "skills": [string]}\n'
                "    ]\n"
                "  },\n"
                '  "education": [\n'
                '    {"degree": string, "institution": string, "year": string}\n'
                "  ],\n"
                '  "jobMatch": {\n'
                '    "title": string,\n'
                '    "matchPercentage": int,\n'
                '    "missingSkills": [string],\n'
                '    "strengths": [string],\n'
                '    "recommendations": [string]\n'
                "  },\n"
                '  "keywords": {\n'
                '    "found": [string],\n'
                '    "missing": [string],\n'
                '    "density": int\n'
                "  },\n"
                '  "formatting": {\n'
                '    "score": int,\n'
                '    "issues": [string]\n'
                "  },\n"
                '  "analysisDate": string (ISO),\n'
                '  "textLength": int\n'
                "}\n"
                "Do NOT include any explanation, only raw JSON."
            ),
        }

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
            ],
            temperature=0.1,
        )

        raw = response.choices[0].message.content or "{}"
        # Cleanup code fences if GPT returns ```json ... ```
        if raw.startswith("```"):
            raw = raw.replace("```json", "").replace("```", "")
            
        return json.loads(raw)

    # ===================== SIMPLE FALLBACK (NO AI) =====================

    def _simple_fallback_analysis(
        self,
        resume_text: str,
        job_description: Optional[str],
        name: str = "Unknown",
        email: str = "",
        phone: str = "",
        error: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Heuristic, dependency-free analysis when AI is not configured."""
        words = resume_text.split()
        text_length = len(words)

        skill_keywords = [
            "python", "java", "javascript", "node", "react", "sql", 
            "mongodb", "docker", "aws", "linux", "html", "css", "flask", "django"
        ]

        found_skills = []
        for kw in skill_keywords:
            if kw.lower() in resume_text.lower():
                found_skills.append(
                    {"name": kw, "confidence": 0.8, "category": "technical"}
                )

        overall_score = min(95, 40 + len(found_skills) * 5 + int(text_length / 200))
        sections = [
            {"name": "Skills Match", "score": min(100, 50 + len(found_skills) * 10)},
            {"name": "Experience", "score": min(100, 40 + text_length // 300)},
            {"name": "Education", "score": 70},
        ]

        return {
            "overallScore": overall_score,
            "personalInfo": {
                "name": name,   # <--- Uses the extracted value
                "email": email, # <--- Uses the extracted value
                "phone": phone, # <--- Uses the extracted value
                "location": "Unknown",
            },
            "sections": sections,
            "skills": found_skills,
            "experience": {
                "totalYears": max(0, text_length // 800),
                "positions": [],
            },
            "education": [],
            "jobMatch": {
                "title": (job_description[:40] + "...") if job_description else "N/A",
                "matchPercentage": overall_score,
                "missingSkills": [],
                "strengths": ["Basic keyword-based analysis"],
                "recommendations": [
                    "Add more quantified achievements.",
                    "Include more role-specific keywords.",
                ],
            },
            "keywords": {
                "found": [s["name"] for s in found_skills],
                "missing": [],
                "density": min(100, len(found_skills) * 10),
            },
            "formatting": {
                "score": 80,
                "issues": [],
            },
            "analysisDate": datetime.utcnow().isoformat(),
            "textLength": text_length,
            "error": error,
        }