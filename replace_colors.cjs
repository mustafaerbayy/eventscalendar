const fs = require('fs');
const files = ['src/pages/WeeklyReports.tsx', 'src/pages/Budget.tsx', 'src/pages/Social.tsx', 'src/pages/SocialProfileView.tsx'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/bg-\[#050505\]/g, 'bg-background');
  
  content = content.replace(/bg-black\/40/g, 'bg-foreground/5');
  content = content.replace(/bg-black\/50/g, 'bg-foreground/5');
  content = content.replace(/\bbg-black\b(?!\/)/g, 'bg-background');
  
  content = content.replace(/text-white\/(\d+)/g, 'text-foreground/$1');
  content = content.replace(/\btext-white\b/g, 'text-foreground');
  
  content = content.replace(/border-white\/(\d+)/g, 'border-border/$1');
  content = content.replace(/bg-white\/(\d+)/g, 'bg-foreground/$1');
  
  fs.writeFileSync(file, content);
});
console.log('Done!');
