const fs = require('fs');
const file = 'src/client/src/components/DaisyUI/Chat.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /        \{\/\* Reactions \*\/\}\n        \{message\.metadata\?\.reactions && message\.metadata\.reactions\.length > 0 && \(\n          <div className="chat-footer">\n            <div className="flex gap-1 mt-1">\n              \{message\.metadata\.reactions\.map\(\(reaction, idx\) => \(\n                <div key=\{idx\} className="badge badge-sm badge-ghost">\n                  \{reaction\.emoji\} \{reaction\.count\}\n                <\/div>\n              \)\)\}\n            <\/div>\n          <\/div>\n        \)\}\n      <\/div>\n    \);\n  \};/,
  `        {/* Reactions */}
        {message.metadata?.reactions && message.metadata.reactions.length > 0 && (
          <div className="chat-footer">
            <div className="flex gap-1 mt-1">
              {message.metadata.reactions.map((reaction, idx) => (
                <div key={idx} className="badge badge-sm badge-ghost">
                  {reaction.emoji} {reaction.count}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};`
);

fs.writeFileSync(file, content);
console.log('Patch applied.');
