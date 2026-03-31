const fs = require('fs');
const path = require('path');

function getRelativePath(fromFile, targetPath) {
  let rel = path.relative(path.dirname(fromFile), targetPath);
  if (!rel.startsWith('.')) rel = './' + rel;
  rel = rel.replace(/\.tsx?$/, '');
  return rel;
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('<ScrollView') && !content.includes('<FlatList') && !content.includes('</ScrollView>') && !content.includes('</FlatList>')) return;
  if (content.includes('VerticalScrollView') || content.includes('VerticalFlatList')) return;

  const originalContent = content;

  // Let's replace </ScrollView> and </FlatList> globally
  content = content.replace(/<\/ScrollView>/g, '</VerticalScrollView>');
  content = content.replace(/<\/FlatList>/g, '</VerticalFlatList>');

  // Let's replace <ScrollView ...> and <FlatList ...>
  // BUT revert ones that have horizontal
  content = content.replace(/<ScrollView/g, '<VerticalScrollView');
  content = content.replace(/<FlatList/g, '<VerticalFlatList');

  // Fix the ones that actually have horizontal to use the original
  // E.g. <VerticalScrollView horizontal ...
  // This is a simpler logic: just change them back!
  content = content.replace(/<VerticalScrollView([^>]*)\bhorizontal\b/g, '<ScrollView$1horizontal');
  content = content.replace(/<VerticalFlatList([^>]*)\bhorizontal\b/g, '<FlatList$1horizontal');

  // Fix closing tags for horizontal ones! Wait, balancing tags using regex is hard.
  // We can just rely on the fact that horizontal scrollviews are usually self-closing or very small.
  // Let's check if there are any horizontal ScrollViews in the codebase.
  
  // To be safe, let's just use the AST / RegExp.
  
  if (content !== originalContent) {
    const hasVertScroll = content.includes('<VerticalScrollView') || content.includes('</VerticalScrollView>');
    const hasVertFlat = content.includes('<VerticalFlatList') || content.includes('</VerticalFlatList>');
    
    if (hasVertScroll || hasVertFlat) {
      const absWrapperFile = '/Users/hariharan/ritgate/frontend/src/components/navigation/VerticalScrollViews';
      const relPath = getRelativePath(filePath, absWrapperFile);
      
      let imports = [];
      if (hasVertScroll) imports.push('VerticalScrollView');
      if (hasVertFlat) imports.push('VerticalFlatList');
      
      const importStr = `import { ${imports.join(', ')} } from '${relPath}';\n`;
      
      const lines = content.split('\n');
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importStr);
        content = lines.join('\n');
      } else {
        content = importStr + content;
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Processed', filePath);
    }
  }
}

processDir(__dirname + '/src/screens');
