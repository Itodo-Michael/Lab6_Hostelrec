"""
Script to generate a PDF containing all source code files from the project.
Requires: pip install reportlab markdown
"""
import os
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

# File extensions to include
CODE_EXTENSIONS = {
    '.py', '.tsx', '.ts', '.js', '.jsx', '.json', 
    '.sql', '.md', '.yml', '.yaml', '.txt', '.css'
}

# Directories to exclude
EXCLUDE_DIRS = {
    'node_modules', '__pycache__', '.git', 'dist', 'build', 
    '.next', 'venv', 'env', '.venv', 'target'
}

# Files to exclude
EXCLUDE_FILES = {
    'package-lock.json', 'yarn.lock', '.DS_Store'
}

def should_include_file(file_path: Path) -> bool:
    """Check if file should be included in PDF."""
    # Check if file extension is in allowed list
    if file_path.suffix not in CODE_EXTENSIONS:
        return False
    
    # Check if file is in exclude list
    if file_path.name in EXCLUDE_FILES:
        return False
    
    # Check if any parent directory is excluded
    parts = file_path.parts
    for part in parts:
        if part in EXCLUDE_DIRS:
            return False
    
    return True

def get_all_code_files(root_dir: Path) -> list[Path]:
    """Get all code files from the project."""
    code_files = []
    
    for root, dirs, files in os.walk(root_dir):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            file_path = Path(root) / file
            if should_include_file(file_path):
                code_files.append(file_path)
    
    # Sort files for consistent ordering
    code_files.sort()
    return code_files

def read_file_content(file_path: Path) -> str:
    """Read file content with error handling."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()
        except Exception as e:
            return f"[Error reading file: {e}]"
    except Exception as e:
        return f"[Error reading file: {e}]"

def create_pdf(output_path: str, root_dir: Path):
    """Create PDF with all code files."""
    # Get all code files
    code_files = get_all_code_files(root_dir)
    
    print(f"Found {len(code_files)} code files to include in PDF...")
    
    # Create PDF document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Container for PDF elements
    story = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Heading style
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=HexColor('#3b82f6'),
        spaceAfter=12,
        spaceBefore=20
    )
    
    # File path style
    path_style = ParagraphStyle(
        'FilePath',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#6b7280'),
        fontName='Courier',
        spaceAfter=6
    )
    
    # Code style
    code_style = ParagraphStyle(
        'Code',
        parent=styles['Code'],
        fontSize=8,
        fontName='Courier',
        leading=10,
        leftIndent=0,
        spaceAfter=12
    )
    
    # Add title page
    story.append(Paragraph("HostelRec Project", title_style))
    story.append(Paragraph("Complete Source Code Documentation", styles['Heading2']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(f"Total files: {len(code_files)}", styles['Normal']))
    story.append(Paragraph(f"Generated: {Path(output_path).stat().st_mtime if Path(output_path).exists() else 'N/A'}", styles['Normal']))
    story.append(PageBreak())
    
    # Add table of contents
    story.append(Paragraph("Table of Contents", heading_style))
    story.append(Spacer(1, 0.2*inch))
    
    for i, file_path in enumerate(code_files, 1):
        rel_path = file_path.relative_to(root_dir)
        story.append(Paragraph(f"{i}. {rel_path}", path_style))
    
    story.append(PageBreak())
    
    # Add each file
    for file_path in code_files:
        rel_path = file_path.relative_to(root_dir)
        
        # Add file header
        story.append(Paragraph(f"File: {rel_path}", heading_style))
        story.append(Paragraph(f"Full path: {file_path}", path_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Read and add file content
        content = read_file_content(file_path)
        
        # Escape special characters for PDF
        content = content.replace('&', '&amp;')
        content = content.replace('<', '&lt;')
        content = content.replace('>', '&gt;')
        
        # Split content into lines and create paragraphs
        lines = content.split('\n')
        
        # Use Preformatted for code blocks
        # Limit line length to prevent overflow
        code_text = '\n'.join(lines)
        # Split long lines if needed
        max_line_length = 120
        wrapped_lines = []
        for line in lines:
            if len(line) > max_line_length:
                # Wrap long lines
                while len(line) > max_line_length:
                    wrapped_lines.append(line[:max_line_length])
                    line = '    ' + line[max_line_length:]
                wrapped_lines.append(line)
            else:
                wrapped_lines.append(line)
        
        code_text = '\n'.join(wrapped_lines)
        story.append(Preformatted(code_text, code_style, maxLineLength=max_line_length))
        
        story.append(Spacer(1, 0.2*inch))
        story.append(PageBreak())
    
    # Build PDF
    print("Building PDF...")
    doc.build(story)
    print(f"PDF created successfully: {output_path}")

def main():
    """Main function."""
    # Get project root directory
    project_root = Path(__file__).parent
    
    # Output PDF path
    output_pdf = project_root / "HostelRec_Complete_Code.pdf"
    
    print(f"Project root: {project_root}")
    print(f"Output PDF: {output_pdf}")
    
    # Create PDF
    create_pdf(str(output_pdf), project_root)
    
    print(f"\nPDF generation complete!")
    print(f"Output file: {output_pdf}")
    print(f"File size: {output_pdf.stat().st_size / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()

