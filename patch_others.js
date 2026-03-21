const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> origin\/main\n?/g, '$2');
  fs.writeFileSync(file, content, 'utf8');
}

fix('src/client/src/components/DaisyUI/Carousel.tsx');
fix('src/client/src/components/Common/CommaSeparatedInput.tsx');
