const fs = require('fs');
const files = [
  'src/pages/SocialProfileView.tsx',
  'src/components/SocialFeed.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Backgrounds
  content = content.replace(/bg-gray-50/g, 'bg-background');
  content = content.replace(/bg-slate-50/g, 'bg-background');
  content = content.replace(/bg-white(?!\/)/g, 'bg-card');
  content = content.replace(/bg-gray-100/g, 'bg-muted');
  content = content.replace(/bg-gray-200/g, 'bg-muted');
  
  // Borders
  content = content.replace(/border-gray-100/g, 'border-border');
  content = content.replace(/border-gray-200/g, 'border-border');
  content = content.replace(/border-gray-300/g, 'border-border');
  
  // Text
  content = content.replace(/text-gray-900/g, 'text-foreground');
  content = content.replace(/text-gray-800/g, 'text-foreground');
  content = content.replace(/text-gray-700/g, 'text-foreground/90');
  content = content.replace(/text-gray-600/g, 'text-muted-foreground');
  content = content.replace(/text-gray-500/g, 'text-muted-foreground');
  content = content.replace(/text-gray-400/g, 'text-muted-foreground/70');
  
  // Hover states
  content = content.replace(/hover:bg-gray-50/g, 'hover:bg-muted/50');
  content = content.replace(/hover:text-gray-900/g, 'hover:text-foreground');
  
  // Special text-white that might have been used inside buttons
  // Actually text-white inside bg-primary is fine, it shouldn't change.
  
  fs.writeFileSync(file, content);
});
console.log('Done!');
