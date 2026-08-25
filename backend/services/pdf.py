from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import io
from datetime import datetime

ACCENT = colors.Color(255 / 255, 107 / 255, 107 / 255)       # #FF6B6B
BG_PAGE = colors.Color(9 / 255, 9 / 255, 11 / 255)           # #09090b
BG_CARD = colors.Color(24 / 255, 24 / 255, 27 / 255)         # #18181b
BG_SURFACE = colors.Color(39 / 255, 39 / 255, 42 / 255)      # #27272a
BG_INSET = colors.Color(12 / 255, 12 / 255, 15 / 255)        # inner text boxes
BORDER = colors.Color(39 / 255, 39 / 255, 42 / 255)          # #27272a
BORDER_LIGHT = colors.Color(30 / 255, 30 / 255, 33 / 255)
TEXT_PRIMARY = colors.Color(250 / 255, 250 / 255, 250 / 255)  # #fafafa
TEXT_SECONDARY = colors.Color(161 / 255, 161 / 255, 170 / 255)  # #a1a1aa
TEXT_MUTED = colors.Color(113 / 255, 113 / 255, 122 / 255)    # #71717a
GREEN = colors.Color(34 / 255, 197 / 255, 94 / 255)           # #22c55e
AMBER = colors.Color(245 / 255, 158 / 255, 11 / 255)          # #f59e0b
RED = colors.Color(239 / 255, 68 / 255, 68 / 255)             # #ef4444
BLUE = colors.Color(59 / 255, 130 / 255, 246 / 255)           # #3b82f6
ORANGE = colors.Color(249 / 255, 115 / 255, 22 / 255)         # #f97316
YELLOW = colors.Color(234 / 255, 179 / 255, 8 / 255)          # #eab308
PURPLE = colors.Color(168 / 255, 85 / 255, 247 / 255)         # #a855f7

AVAIL_W = A4[0] - 3.6 * cm  # usable width inside margins


def _grade_badge(pct: int) -> tuple:
    if pct >= 80:
        return "A", GREEN, colors.Color(34 / 255, 197 / 255, 94 / 255, 0.15)
    if pct >= 60:
        return "B", BLUE, colors.Color(59 / 255, 130 / 255, 246 / 255, 0.15)
    if pct >= 40:
        return "C", AMBER, colors.Color(245 / 255, 158 / 255, 11 / 255, 0.15)
    return "F", RED, colors.Color(239 / 255, 68 / 255, 68 / 255, 0.15)


def _pct_color(pct: int) -> colors.Color:
    if pct >= 70:
        return GREEN
    if pct >= 40:
        return AMBER
    return RED


def _status_label(status: str) -> tuple:
    if status == "attempted":
        return "Attempted", GREEN
    if status == "not_attempted":
        return "Not attempted", TEXT_MUTED
    return "Failed", RED


def _make_styles():
    return {
        "brand": ParagraphStyle(
            "brand", fontName="Helvetica-Bold", fontSize=22,
            textColor=ACCENT, spaceAfter=2,
        ),
        "meta_label": ParagraphStyle(
            "metalabel", fontName="Helvetica", fontSize=9,
            textColor=TEXT_MUTED, leading=14,
        ),
        "meta_value": ParagraphStyle(
            "metavalue", fontName="Helvetica-Bold", fontSize=9,
            textColor=TEXT_PRIMARY, leading=14,
        ),
        "score_sub": ParagraphStyle(
            "scoresub", fontName="Helvetica", fontSize=10,
            textColor=TEXT_MUTED, spaceAfter=0,
        ),
        "section": ParagraphStyle(
            "sectiontitle", fontName="Helvetica-Bold", fontSize=11,
            textColor=TEXT_PRIMARY, spaceBefore=8, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "bodytext", fontName="Helvetica", fontSize=9,
            textColor=TEXT_SECONDARY, leading=13,
        ),
        "badge": ParagraphStyle(
            "badge", fontName="Helvetica-Bold", fontSize=18,
            alignment=TA_CENTER, leading=22,
        ),
        "footer": ParagraphStyle(
            "footer", fontName="Helvetica", fontSize=7,
            textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=6,
        ),
        "q_title": ParagraphStyle(
            "qtitle", fontName="Helvetica-Bold", fontSize=9.5,
            textColor=TEXT_PRIMARY, leading=13,
        ),
        "q_body": ParagraphStyle(
            "qbody", fontName="Helvetica", fontSize=8.5,
            textColor=TEXT_SECONDARY, leading=12,
        ),
        "q_feedback": ParagraphStyle(
            "qfeedback", fontName="Helvetica", fontSize=8.5,
            textColor=TEXT_SECONDARY, leading=12,
        ),
        "label_muted": ParagraphStyle(
            "labelmuted", fontName="Helvetica-Bold", fontSize=7.5,
            textColor=TEXT_MUTED,
        ),
        "bullet": ParagraphStyle(
            "bullet", fontName="Helvetica", fontSize=8.5,
            textColor=TEXT_SECONDARY, leading=12, leftIndent=10,
        ),
        "answer_box": ParagraphStyle(
            "answerbox", fontName="Helvetica", fontSize=8.5,
            textColor=TEXT_SECONDARY, leading=12,
        ),
    }


def generate_pdf(evaluation: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=1.8 * cm, leftMargin=1.8 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
    )
    S = _make_styles()
    story = []

    # ═══════════════════════════════════════════════════════════════
    #  HEADER
    # ═══════════════════════════════════════════════════════════════
    header_data = [[
        Paragraph("<b>GradeAI</b>", ParagraphStyle(
            "brand_h", fontName="Helvetica-Bold", fontSize=22,
            textColor=ACCENT, leading=28,
        )),
        Paragraph("Evaluation Report", ParagraphStyle(
            "headerright", fontName="Helvetica", fontSize=9,
            textColor=TEXT_MUTED, alignment=TA_RIGHT, leading=14,
        )),
    ]]
    ht = Table(header_data, colWidths=["60%", "40%"])
    ht.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(ht)
    story.append(Spacer(1, 3))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=10))

    # ═══════════════════════════════════════════════════════════════
    #  STUDENT INFO CARD
    # ═══════════════════════════════════════════════════════════════
    created = evaluation.get("created_at", "")
    if isinstance(created, str) and created:
        try:
            created = datetime.fromisoformat(created).strftime("%B %d, %Y")
        except Exception:
            created = str(created)[:20]
    elif isinstance(created, datetime):
        created = created.strftime("%B %d, %Y")
    else:
        created = datetime.now().strftime("%B %d, %Y")

    student_name = evaluation.get("student_name", "Unknown")
    exam_title = evaluation.get("exam_title", "")
    exam_subject = evaluation.get("exam_subject", "")

    info_rows = []
    info_rows.append([Paragraph("STUDENT", S["meta_label"]), Paragraph(_esc(student_name), S["meta_value"])])
    if exam_title:
        label_text = _esc(exam_title)
        if exam_subject:
            label_text += f"  ·  {_esc(exam_subject)}"
        info_rows.append([Paragraph("EXAM", S["meta_label"]), Paragraph(label_text, S["meta_value"])])
    info_rows.append([Paragraph("DATE", S["meta_label"]), Paragraph(created, S["meta_value"])])
    teacher_name = evaluation.get("teacher_name", "")
    if teacher_name:
        info_rows.append([Paragraph("TEACHER", S["meta_label"]), Paragraph(_esc(teacher_name), S["meta_value"])])

    info_table = Table(info_rows, colWidths=[2.5 * cm, AVAIL_W - 2.5 * cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4 * cm))

    # ═══════════════════════════════════════════════════════════════
    #  SCORE BANNER
    # ═══════════════════════════════════════════════════════════════
    ev = evaluation.get("evaluation", {})
    total = ev.get("score", 0)
    max_total = evaluation.get("marks", 10)
    pct = round((total / max_total) * 100) if max_total else 0
    grade_letter, grade_color, grade_bg = _grade_badge(pct)

    score_html = (
        f'<font size="28"><b>{total}</b></font>'
        f'<font size="14" color="#{_hex(TEXT_MUTED)}"> / {max_total}</font>'
    )
    pct_html = f'<font color="#{_hex(_pct_color(pct))}"><b>{pct}%</b></font> overall'
    grade_para = Paragraph(
        f'<font color="#{_hex(grade_color)}"><b>{grade_letter}</b></font>', S["badge"],
    )

    score_data = [[
        [Paragraph(score_html, ParagraphStyle("sl", fontName="Helvetica-Bold", fontSize=10, textColor=TEXT_PRIMARY, leading=34)),
         Paragraph(pct_html, S["score_sub"])],
        grade_para,
    ]]
    score_table = Table(score_data, colWidths=["82%", "18%"])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (0, -1), 14),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (-1, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (-1, 0), (-1, -1), grade_bg),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 0.5 * cm))

    # ═══════════════════════════════════════════════════════════════
    #  PER-QUESTION CARDS
    # ═══════════════════════════════════════════════════════════════
    per_q = evaluation.get("per_question_results", [])
    if per_q:
        story.append(Paragraph(
            f"Per-Question Breakdown ({len(per_q)} questions)", S["section"],
        ))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8))

        for q in per_q:
            card = _build_question_card(q, S)
            story.append(KeepTogether(card))
            story.append(Spacer(1, 0.35 * cm))

    else:
        _build_single_question(story, ev, evaluation, S)

    # ═══════════════════════════════════════════════════════════════
    #  FOOTER
    # ═══════════════════════════════════════════════════════════════
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))
    story.append(Paragraph(
        f'Generated by <font color="#{_hex(ACCENT)}"><b>GradeAI</b></font>  ·  {datetime.now().strftime("%B %d, %Y at %H:%M")}',
        S["footer"],
    ))

    def _draw_bg(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(BG_PAGE)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.restoreState()

    doc.build(story, onFirstPage=_draw_bg, onLaterPages=_draw_bg)
    return buffer.getvalue()


def _build_question_card(q: dict, S: dict) -> list:
    """Build a list of flowables representing one question card."""
    elements = []
    q_num = q.get("question_number", "")
    q_text = q.get("question_text", "") or ""
    score_val = q.get("score", 0)
    max_marks = q.get("max_marks", 0)
    q_pct = round((score_val / max_marks) * 100) if max_marks else 0
    status_text, status_color = _status_label(q.get("status", ""))
    pc = _pct_color(q_pct)

    # ── Card header row: Q# badge  |  question text  |  score + status ──
    q_badge = Paragraph(
        f'<font color="#{_hex(ACCENT)}"><b>Q{q_num}</b></font>',
        ParagraphStyle("qb", fontName="Helvetica-Bold", fontSize=10, textColor=ACCENT, alignment=TA_CENTER),
    )
    q_title = Paragraph(_esc(q_text), S["q_title"])
    score_para = Paragraph(
        f'<font color="#{_hex(pc)}"><b>{score_val}/{max_marks}</b></font>'
        f'  <font color="#{_hex(TEXT_MUTED)}" size="8">({q_pct}%)</font>',
        ParagraphStyle("qs", fontName="Helvetica-Bold", fontSize=10, alignment=TA_RIGHT),
    )
    status_para = Paragraph(
        f'<font color="#{_hex(status_color)}" size="7">{status_text}</font>',
        ParagraphStyle("qst", fontSize=7, alignment=TA_RIGHT),
    )

    header_data = [[q_badge, q_title, [score_para, status_para]]]
    header_table = Table(header_data, colWidths=[1.2 * cm, AVAIL_W - 1.2 * cm - 3.5 * cm, 3.5 * cm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (0, -1), 8),
        ("LEFTPADDING", (1, 0), (1, -1), 6),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, BORDER_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(header_table)

    # ── Card body: detail sections ──────────────────────────────
    body_parts = []

    # Student answer
    student_answer = q.get("student_answer", "") or ""
    if student_answer:
        body_parts.append(_section_label("AI CORRECTED TEXT", ACCENT, S))
        body_parts.append(_inset_box(_esc(student_answer), S))
        body_parts.append(Spacer(1, 4))

    # Concept coverage bar
    coverage = q.get("concept_coverage")
    if coverage is not None:
        cov_color = _pct_color(coverage)
        body_parts.append(_section_label("CONCEPT COVERAGE", TEXT_MUTED, S))
        body_parts.append(_progress_bar(coverage, cov_color))
        body_parts.append(Spacer(1, 4))

    # Feedback
    feedback = q.get("feedback", "") or ""
    if feedback:
        body_parts.append(_section_label("FEEDBACK", TEXT_MUTED, S))
        body_parts.append(Paragraph(_esc(feedback), S["q_feedback"]))
        body_parts.append(Spacer(1, 4))

    # Strengths
    strengths = q.get("strengths", []) or []
    if strengths:
        body_parts.append(_section_label("STRENGTHS", GREEN, S))
        for s in strengths:
            body_parts.append(Paragraph(
                f'<font color="#{_hex(GREEN)}">&#x2713;</font>  {_esc(s)}', S["bullet"],
            ))
        body_parts.append(Spacer(1, 4))

    # Missing topics
    missing = q.get("missing_topics", []) or []
    if missing:
        body_parts.append(_section_label("MISSING TOPICS", RED, S))
        for m in missing:
            body_parts.append(Paragraph(
                f'<font color="#{_hex(RED)}">&#x2717;</font>  {_esc(m)}', S["bullet"],
            ))
        body_parts.append(Spacer(1, 4))

    # Mistakes
    mistakes = q.get("mistakes", []) or []
    if mistakes:
        body_parts.append(_section_label("MISTAKES", ORANGE, S))
        for mk in mistakes:
            if isinstance(mk, str):
                body_parts.append(Paragraph(
                    f'<font color="#{_hex(RED)}"><strike>{_esc(mk)}</strike></font>', S["bullet"],
                ))
            else:
                phrase = mk.get("phrase", "")
                correction = mk.get("correction", "")
                line = f'<font color="#{_hex(RED)}"><strike>{_esc(phrase)}</strike></font>'
                if correction:
                    line += f'  <font color="#{_hex(GREEN)}">&#x2192; {_esc(correction)}</font>'
                body_parts.append(Paragraph(line, S["bullet"]))
        body_parts.append(Spacer(1, 4))

    # Improved answer
    improved = q.get("improved_answer", "") or ""
    if improved:
        body_parts.append(_section_label("IMPROVED ANSWER", YELLOW, S))
        body_parts.append(_inset_box(_esc(improved), S, border_color=colors.Color(234 / 255, 179 / 255, 8 / 255, 0.25)))
        body_parts.append(Spacer(1, 4))

    if body_parts:
        body_cell = [body_parts]
        body_table = Table([body_cell], colWidths=[AVAIL_W])
        body_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.Color(15 / 255, 15 / 255, 18 / 255)),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        elements.append(body_table)

    return elements


def _build_single_question(story, ev, evaluation, S):
    """Fallback for single-question evaluations."""
    story.append(Paragraph("Evaluation Details", S["section"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8))

    feedback = ev.get("feedback", "") or evaluation.get("feedback", "")
    if feedback:
        story.append(_section_label("AI FEEDBACK", ACCENT, S))
        story.append(Paragraph(_esc(feedback), S["body"]))
        story.append(Spacer(1, 0.3 * cm))

    strengths = ev.get("strengths", [])
    if strengths:
        story.append(_section_label("STRENGTHS", GREEN, S))
        for s in strengths:
            story.append(Paragraph(
                f'<font color="#{_hex(GREEN)}">&#x2713;</font>  {_esc(s)}', S["bullet"],
            ))
        story.append(Spacer(1, 0.2 * cm))

    missing = ev.get("missing_topics", [])
    if missing:
        story.append(_section_label("MISSING TOPICS", RED, S))
        for m in missing:
            story.append(Paragraph(
                f'<font color="#{_hex(RED)}">&#x2717;</font>  {_esc(m)}', S["bullet"],
            ))
        story.append(Spacer(1, 0.2 * cm))


def _section_label(text: str, color: colors.Color, S: dict) -> Paragraph:
    return Paragraph(
        f'<font color="#{_hex(color)}"><b>{text}</b></font>',
        ParagraphStyle(f"lbl_{text}", fontName="Helvetica-Bold", fontSize=7.5,
                       textColor=color, spaceBefore=2, spaceAfter=3),
    )


def _inset_box(text: str, S: dict, border_color=None) -> Table:
    bc = border_color or BORDER_LIGHT
    para = Paragraph(text, S["answer_box"])
    t = Table([[para]], colWidths=[AVAIL_W - 24])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_INSET),
        ("BOX", (0, 0), (-1, -1), 0.5, bc),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def _progress_bar(pct: int, bar_color: colors.Color) -> Table:
    """Render a simple text-based coverage line."""
    return Paragraph(
        f'<font color="#{_hex(bar_color)}"><b>{pct}%</b></font>'
        f'  <font color="#{_hex(TEXT_MUTED)}">concept coverage</font>',
        ParagraphStyle("pbar", fontName="Helvetica-Bold", fontSize=9, leading=12),
    )


def _esc(text: str) -> str:
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _hex(c: colors.Color) -> str:
    r = min(255, max(0, int(c.red * 255)))
    g = min(255, max(0, int(c.green * 255)))
    b = min(255, max(0, int(c.blue * 255)))
    return f"{r:02x}{g:02x}{b:02x}"
