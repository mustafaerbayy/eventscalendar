const fs = require('fs');
let content = fs.readFileSync('src/components/SocialFeed.tsx', 'utf8');

content = content.replace(/bg-foreground\/ /g, 'bg-card ');
content = content.replace(/border-border\/ /g, 'border-border/20 ');
content = content.replace(/text-foreground\/ /g, 'text-foreground/80 ');

content = content.replace(/bg-foreground\/"/g, 'bg-card"');
content = content.replace(/border-border\/"/g, 'border-border/20"');
content = content.replace(/text-foreground\/"/g, 'text-foreground/80"');

// Fix some specific places
content = content.replace(/bg-foreground\/80/g, 'bg-card/80');

fs.writeFileSync('src/components/SocialFeed.tsx', content);

let social = fs.readFileSync('src/pages/Social.tsx', 'utf8');
social = social.replace(/bg-foreground\/ /g, 'bg-card ');
social = social.replace(/border-border\/ /g, 'border-border/20 ');
social = social.replace(/bg-foreground\/"/g, 'bg-card"');
social = social.replace(/border-border\/"/g, 'border-border/20"');
fs.writeFileSync('src/pages/Social.tsx', social);
