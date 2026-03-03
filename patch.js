const fs = require('fs');
const path = 'src/client/src/components/DaisyUI/Carousel.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /<a href={`#slide\${[^}]+}`} className="btn btn-circle" onClick={handlePrev}>[\s\n]*❮[\s\n]*<\/a>/,
    `<button type="button" className="btn btn-circle" onClick={(e) => { e.preventDefault(); handlePrev(); }}>
                ❮
              </button>`
);

content = content.replace(
    /<a href={`#slide\${[^}]+}`} className="btn btn-circle" onClick={handleNext}>[\s\n]*❯[\s\n]*<\/a>/,
    `<button type="button" className="btn btn-circle" onClick={(e) => { e.preventDefault(); handleNext(); }}>
                ❯
              </button>`
);

content = content.replace(
    /<a\s*key={index}\s*href={`#slide\${index}`}\s*className={`btn btn-xs \${index === activeIndex \? 'btn-active' : ''}`}\s*onClick={\(\) => handleSelect\(index\)}\s*>\s*{index \+ 1}\s*<\/a>/,
    `<button
            type="button"
            key={index}
            className={\`btn btn-xs \${index === activeIndex ? 'btn-active' : ''}\`}
            onClick={(e) => { e.preventDefault(); handleSelect(index); }}
          >
            {index + 1}
          </button>`
);

fs.writeFileSync(path, content);
console.log("Patched successfully");
