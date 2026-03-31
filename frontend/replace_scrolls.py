import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if '<ScrollView' not in content and '<FlatList' not in content:
        return

    # Skip files that contain horizontal scrollviews
    if re.search(r'<ScrollView[^>]*\bhorizontal', content) or re.search(r'<FlatList[^>]*\bhorizontal', content):
        print(f"SKIPPING horizontal-mixed file: {filepath}")
        return

    # We must only replace actual tags, not imports. 
    # Because <ScrollView and </ScrollView> ARE tags, but what if there's no space?
    
    # We shouldn't replace the react-native import for ScrollView because they might use ScrollViewProps!
    # Instead, we just replace instances of `<ScrollView` with `<VerticalScrollView`
    original = content
    content = content.replace('<ScrollView', '<VerticalScrollView')
    content = content.replace('</ScrollView>', '</VerticalScrollView>')
    content = content.replace('<FlatList', '<VerticalFlatList')
    content = content.replace('</FlatList>', '</VerticalFlatList>')

    if content != original:
        rel_path = os.path.relpath('/Users/hariharan/ritgate/frontend/src/components/navigation/VerticalScrollViews', os.path.dirname(filepath))
        if not rel_path.startswith('.'):
            rel_path = './' + rel_path
        
        imports = []
        if 'VerticalScrollView' in content: imports.append('VerticalScrollView')
        if 'VerticalFlatList' in content: imports.append('VerticalFlatList')
        
        import_str = f"import {{ {', '.join(imports)} }} from '{rel_path}';\n"
        
        lines = content.split('\n')
        last_import = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import = i
                
        if last_import != -1:
            lines.insert(last_import + 1, import_str)
            content = '\n'.join(lines)
        else:
            content = import_str + content
            
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Processed: {filepath}")
    else:
        print(f"No changes made to {filepath}")

def process_dir(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

process_dir('/Users/hariharan/ritgate/frontend/src/screens')
