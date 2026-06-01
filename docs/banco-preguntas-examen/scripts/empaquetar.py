#!/usr/bin/env python3
"""
empaquetar.py — Convierte un banco de preguntas entre Markdown y JSON
estructurado, y valida que cada pregunta tenga los campos requeridos.

Uso:
    python empaquetar.py --input banco.md --output banco.json --format json
    python empaquetar.py --input banco.json --output banco.md --format md
    python empaquetar.py --input banco.md --validate   # solo validar

Formato esperado del Markdown: ver SKILL.md (sección "Formato canónico").
"""

import argparse
import json
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Parsing Markdown → estructura
# ---------------------------------------------------------------------------

QUESTION_HEADER_RE = re.compile(r"^##\s+Pregunta\s+(.+?)\s*$", re.MULTILINE)
FIELD_RE = re.compile(r"^\*\*([^*]+):\*\*\s*(.*)$")
OPTION_LINE_RE = re.compile(r"^\s*[-*]\s*([a-zA-Z0-9]+)[.\)]\s+(.+)$")
VF_OPTION_RE = re.compile(r"^\s*[-*]\s+(Verdadero|Falso)\s*$", re.IGNORECASE)


def parse_markdown(text: str) -> dict:
    """Parsea el banco de preguntas en MD a un dict estructurado."""
    # Título opcional al principio del archivo
    title_match = re.search(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
    title = title_match.group(1) if title_match else "Banco de preguntas"

    # Cortamos el texto en bloques por cada `## Pregunta N`
    chunks = re.split(r"(?=^##\s+Pregunta\s+)", text, flags=re.MULTILINE)
    questions = []
    for chunk in chunks:
        if not chunk.strip().startswith("## Pregunta"):
            continue
        q = parse_question_block(chunk)
        if q:
            questions.append(q)

    return {"title": title, "count": len(questions), "questions": questions}


def parse_question_block(block: str) -> dict | None:
    """Parsea un bloque individual de pregunta. Devuelve None si no se pudo."""
    header = QUESTION_HEADER_RE.search(block)
    if not header:
        return None

    # Campos canónicos conocidos. Cualquier otro campo se preserva en 'extras'.
    q = {
        "id": header.group(1).strip(),
        "tipo": None,
        "enunciado": None,
        "referencia_visual": None,
        "opciones": [],
        "respuesta_correcta": None,
        "explicacion": None,
        "extras": {},  # campos no canónicos: "Conceptos disponibles", etc.
    }

    KNOWN = {"tipo", "enunciado", "referencia_visual", "opciones",
             "respuesta_correcta", "explicacion"}

    sections = split_fields(block)
    for name, content in sections.items():
        key = normalize_field_name(name)
        if key == "opciones":
            q["opciones"] = parse_options(content)
        elif key in KNOWN:
            q[key] = content.strip() or None
        else:
            # Campos no canónicos: conservar el nombre original y el contenido.
            q["extras"][name] = content.strip()

    # Limpiar extras vacíos
    if not q["extras"]:
        del q["extras"]
    return q


def split_fields(block: str) -> dict:
    """Toma un bloque y devuelve un dict {nombre_campo: contenido}."""
    # Buscamos cada `**Campo:**` y todo lo que sigue hasta el próximo o `---`
    pattern = re.compile(r"\*\*([^*]+):\*\*", re.MULTILINE)
    matches = list(pattern.finditer(block))
    sections = {}
    for i, match in enumerate(matches):
        name = match.group(1).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(block)
        content = block[start:end]
        # Remover separador final `---` si está
        content = re.sub(r"\n---\s*$", "", content)
        sections[name] = content
    return sections


def normalize_field_name(name: str) -> str:
    """Normaliza nombres de campo: minúsculas, sin tildes ni espacios."""
    table = str.maketrans("áéíóúÁÉÍÓÚ", "aeiouAEIOU")
    return name.translate(table).lower().replace(" ", "_")


def parse_options(content: str) -> list[dict]:
    """Parsea las opciones. Soporta a/b/c y Verdadero/Falso."""
    options = []
    for line in content.splitlines():
        line = line.rstrip()
        # Verdadero/Falso
        vf = VF_OPTION_RE.match(line)
        if vf:
            label = vf.group(1)
            options.append({"label": label, "text": label})
            continue
        # Opciones a/b/c o 1/2/3
        opt = OPTION_LINE_RE.match(line)
        if opt:
            options.append({"label": opt.group(1), "text": opt.group(2).strip()})
    return options


# ---------------------------------------------------------------------------
# Serialización: estructura → Markdown
# ---------------------------------------------------------------------------

def to_markdown(data: dict) -> str:
    """Convierte un banco estructurado de vuelta a Markdown."""
    parts = [f"# {data.get('title', 'Banco de preguntas')}\n"]
    for q in data.get("questions", []):
        parts.append(question_to_markdown(q))
    return "\n".join(parts).rstrip() + "\n"


def question_to_markdown(q: dict) -> str:
    lines = [f"## Pregunta {q.get('id', '?')}", ""]
    if q.get("tipo"):
        lines += [f"**Tipo:** {q['tipo']}", ""]
    if q.get("enunciado"):
        lines += [f"**Enunciado:** {q['enunciado']}", ""]
    if q.get("referencia_visual"):
        lines += [f"**Referencia visual:** {q['referencia_visual']}", ""]
    # Campos no canónicos (Conceptos disponibles, Ítems a relacionar, etc.)
    # van entre el enunciado y las opciones/respuesta.
    for name, content in (q.get("extras") or {}).items():
        # Si el contenido tiene múltiples líneas (típico de listas), preservar formato.
        if "\n" in content:
            lines += [f"**{name}:**", "", content, ""]
        else:
            lines += [f"**{name}:** {content}", ""]
    if q.get("opciones"):
        lines += ["**Opciones:**", ""]
        for opt in q["opciones"]:
            label = opt.get("label", "")
            text = opt.get("text", "")
            if label in ("Verdadero", "Falso"):
                lines.append(f"- {label}")
            else:
                lines.append(f"- {label}. {text}")
        lines.append("")
    if q.get("respuesta_correcta"):
        rc = q["respuesta_correcta"]
        # Si la respuesta es multilínea (típico de relacionar), preservar formato.
        if "\n" in rc:
            lines += ["**Respuesta correcta:**", "", rc, ""]
        else:
            lines += [f"**Respuesta correcta:** {rc}", ""]
    if q.get("explicacion"):
        lines += [f"**Explicación:** {q['explicacion']}", ""]
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Validación
# ---------------------------------------------------------------------------

REQUIRED_FIELDS = {
    "default": ["tipo", "enunciado", "opciones", "respuesta_correcta", "explicacion"],
}


def validate(data: dict) -> list[str]:
    """Devuelve lista de problemas encontrados. Lista vacía = OK."""
    problems = []
    questions = data.get("questions", [])

    if not questions:
        problems.append("El banco no contiene preguntas.")
        return problems

    for q in questions:
        qid = q.get("id", "?")
        tipo = (q.get("tipo") or "").lower()
        is_matching = "relacionar" in tipo or "match" in tipo

        for field in REQUIRED_FIELDS["default"]:
            # En preguntas de Relacionar, "opciones" no es obligatorio porque
            # se usan los campos "Conceptos disponibles" + "Ítems a relacionar".
            if is_matching and field == "opciones":
                continue
            value = q.get(field)
            if value is None or (isinstance(value, (str, list)) and not value):
                problems.append(f"Pregunta {qid}: falta el campo '{field}'.")

        # Validaciones extra de coherencia
        opts = q.get("opciones") or []
        if "verdadero" in tipo or "falso" in tipo or "v/f" in tipo:
            labels = {o.get("label", "").lower() for o in opts}
            if not ({"verdadero", "falso"} <= labels):
                problems.append(
                    f"Pregunta {qid}: tipo V/F pero las opciones no son "
                    "Verdadero/Falso."
                )
        elif opts and len(opts) < 2:
            problems.append(f"Pregunta {qid}: tiene menos de 2 opciones.")

        # Verificar que la explicación tenga sustancia (no una sola palabra)
        expl = q.get("explicacion") or ""
        if expl and len(expl.split()) < 5:
            problems.append(
                f"Pregunta {qid}: la explicación es muy corta "
                f"({len(expl.split())} palabras). Debería justificar la respuesta."
            )

    return problems


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Empaqueta o valida un banco de preguntas."
    )
    parser.add_argument("--input", "-i", required=True, help="Archivo de entrada (MD o JSON).")
    parser.add_argument("--output", "-o", help="Archivo de salida.")
    parser.add_argument(
        "--format",
        choices=["json", "md"],
        help="Formato de salida. Si se omite, se infiere de la extensión.",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Solo validar, no escribir output.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Salir con código de error si la validación falla.",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: no existe el archivo {input_path}", file=sys.stderr)
        sys.exit(2)

    raw = input_path.read_text(encoding="utf-8")
    # Detectar formato de entrada
    if input_path.suffix.lower() == ".json":
        data = json.loads(raw)
    else:
        data = parse_markdown(raw)

    # Validar
    problems = validate(data)
    if problems:
        print(f"⚠ Validación: {len(problems)} problema(s) encontrado(s):", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        if args.strict:
            sys.exit(1)
    else:
        print(f"✔ Validación OK: {data.get('count', 0)} preguntas, sin problemas.", file=sys.stderr)

    if args.validate:
        return

    # Determinar formato de salida
    output_format = args.format
    output_path = Path(args.output) if args.output else None
    if not output_format and output_path:
        output_format = "json" if output_path.suffix.lower() == ".json" else "md"
    if not output_format:
        output_format = "json"

    # Serializar
    if output_format == "json":
        result = json.dumps(data, ensure_ascii=False, indent=2)
    else:
        result = to_markdown(data)

    if output_path:
        output_path.write_text(result, encoding="utf-8")
        print(f"✔ Escrito en {output_path}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
