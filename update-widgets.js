const fs = require('fs');
const file = 'src/client/src/components/DaisyUI/DashboardWidgetSystem.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the component start and widget types
const componentStartStr = `const DashboardWidgetSystem: React.FC<DashboardWidgetSystemProps> = ({
  initialWidgets = [],
  onWidgetsChange,
  readOnly = false,
  gridSize = 20,
}) => {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWidgetPalette, setShowWidgetPalette] = useState(false);

  const widgetTypes: WidgetType[] = useMemo(() => [`;

const replacementStart = `// Define static widget types outside the component to avoid re-creation on every render
const WIDGET_TYPES: WidgetType[] = [`;

content = content.replace(componentStartStr, replacementStart);

// Replace the end of widget types
const componentEndStr = `    },
  ], []);

  const widgetTypeMap = useMemo(() => new Map(widgetTypes.map(t => [t.id, t])), [widgetTypes]);`;

const replacementEnd = `    },
];

// Pre-compute a lookup map to achieve O(1) lookups during render, replacing O(N) array .find() calls
const WIDGET_TYPE_MAP = new Map(WIDGET_TYPES.map(t => [t.id, t]));

const DashboardWidgetSystem: React.FC<DashboardWidgetSystemProps> = ({
  initialWidgets = [],
  onWidgetsChange,
  readOnly = false,
  gridSize = 20,
}) => {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWidgetPalette, setShowWidgetPalette] = useState(false);`;

content = content.replace(componentEndStr, replacementEnd);

// Replace the usages
content = content.replace(/widgetTypeMap\.get/g, 'WIDGET_TYPE_MAP.get');
content = content.replace(/widgetTypes\.map/g, 'WIDGET_TYPES.map');

fs.writeFileSync(file, content);
