import re
from markdown import Markdown
from pygments.formatters import HtmlFormatter


def render_markdown(content: str) -> str:
    md = Markdown(extensions=["fenced_code", "codehilite", "tables", "toc"])
    html = md.convert(content)

    # Add target="_blank" to external links
    html = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', html)

    return html


def get_codehilite_css() -> str:
    return HtmlFormatter().get_style_defs(".codehilite")
