'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  FolderOpen,
  LayoutTemplate,
  Settings,
  ShieldCheck,
  Play,
  ToggleRight,
  PanelLeftClose,
  FilePlus,
  Search,
  Bold,
  Italic,
  Underline,
  Heading1,
  Sigma,
  Image as ImageIcon,
  Table,
  Sun,
  Moon,
  Monitor,
  BookOpen,
  CreditCard,
  Keyboard,
  Download,
  Share2,
  FileArchive,
  List,
} from 'lucide-react'

interface CommandEntry {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

interface CommandGroupEntry {
  heading: string
  commands: CommandEntry[]
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { setTheme } = useTheme()

  const isEditorPage = pathname.startsWith('/editor') || pathname.startsWith('/projects/')

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function runCommand(action: () => void) {
    setOpen(false)
    action()
  }

  function dispatchCustomEvent(name: string, detail?: unknown) {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }

  // --- Command groups ---

  const navigationGroup: CommandGroupEntry = {
    heading: 'Navigation',
    commands: [
      {
        id: 'nav-projects',
        label: 'Go to Projects',
        icon: <FolderOpen className="size-4" />,
        action: () => router.push('/projects'),
      },
      {
        id: 'nav-templates',
        label: 'Go to Templates',
        icon: <LayoutTemplate className="size-4" />,
        action: () => router.push('/templates'),
      },
      {
        id: 'nav-docs',
        label: 'Go to Documentation',
        icon: <BookOpen className="size-4" />,
        action: () => router.push('/docs'),
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        icon: <Settings className="size-4" />,
        action: () => router.push('/settings'),
      },
      {
        id: 'nav-pricing',
        label: 'Go to Pricing',
        icon: <CreditCard className="size-4" />,
        action: () => router.push('/pricing'),
      },
      {
        id: 'nav-admin',
        label: 'Go to Admin',
        icon: <ShieldCheck className="size-4" />,
        action: () => router.push('/admin'),
      },
    ],
  }

  const editorGroup: CommandGroupEntry = {
    heading: 'Editor',
    commands: [
      {
        id: 'editor-compile',
        label: 'Compile Project',
        icon: <Play className="size-4" />,
        shortcut: 'Ctrl+Enter',
        action: () => dispatchCustomEvent('latex-compile'),
      },
      {
        id: 'editor-autocompile',
        label: 'Toggle Auto-compile',
        icon: <ToggleRight className="size-4" />,
        action: () => dispatchCustomEvent('toggle-autocompile'),
      },
      {
        id: 'editor-sidebar',
        label: 'Toggle Sidebar',
        icon: <PanelLeftClose className="size-4" />,
        action: () => dispatchCustomEvent('toggle-sidebar'),
      },
      {
        id: 'editor-newfile',
        label: 'New File',
        icon: <FilePlus className="size-4" />,
        action: () => dispatchCustomEvent('new-file'),
      },
      {
        id: 'editor-find',
        label: 'Find in Files',
        icon: <Search className="size-4" />,
        shortcut: 'Ctrl+Shift+F',
        action: () => dispatchCustomEvent('find-in-files'),
      },
      {
        id: 'editor-shortcuts',
        label: 'Keyboard Shortcuts',
        icon: <Keyboard className="size-4" />,
        shortcut: '?',
        action: () => dispatchCustomEvent('show-shortcuts'),
      },
      {
        id: 'editor-share',
        label: 'Share Project',
        icon: <Share2 className="size-4" />,
        action: () => dispatchCustomEvent('share-project'),
      },
      {
        id: 'editor-export-zip',
        label: 'Export as ZIP',
        icon: <FileArchive className="size-4" />,
        action: () => dispatchCustomEvent('export-zip'),
      },
      {
        id: 'editor-outline',
        label: 'Document Outline',
        icon: <List className="size-4" />,
        action: () => dispatchCustomEvent('show-outline'),
      },
    ],
  }

  const latexGroup: CommandGroupEntry = {
    heading: 'LaTeX',
    commands: [
      {
        id: 'latex-bold',
        label: 'Insert Bold',
        icon: <Bold className="size-4" />,
        shortcut: 'Ctrl+B',
        action: () => dispatchCustomEvent('latex-insert', { text: '\\textbf{}' }),
      },
      {
        id: 'latex-italic',
        label: 'Insert Italic',
        icon: <Italic className="size-4" />,
        shortcut: 'Ctrl+I',
        action: () => dispatchCustomEvent('latex-insert', { text: '\\textit{}' }),
      },
      {
        id: 'latex-underline',
        label: 'Insert Underline',
        icon: <Underline className="size-4" />,
        shortcut: 'Ctrl+U',
        action: () => dispatchCustomEvent('latex-insert', { text: '\\underline{}' }),
      },
      {
        id: 'latex-section',
        label: 'Insert Section',
        icon: <Heading1 className="size-4" />,
        action: () => dispatchCustomEvent('latex-insert', { text: '\\section{}' }),
      },
      {
        id: 'latex-math',
        label: 'Insert Math Mode',
        icon: <Sigma className="size-4" />,
        shortcut: 'Ctrl+M',
        action: () => dispatchCustomEvent('latex-insert', { text: '$$' }),
      },
      {
        id: 'latex-figure',
        label: 'Insert Figure',
        icon: <ImageIcon className="size-4" />,
        action: () =>
          dispatchCustomEvent('latex-insert', {
            text: '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{filename}\n  \\caption{Caption text}\n  \\label{fig:label}\n\\end{figure}',
          }),
      },
      {
        id: 'latex-table',
        label: 'Insert Table',
        icon: <Table className="size-4" />,
        action: () =>
          dispatchCustomEvent('latex-insert', {
            text: '\\begin{table}[htbp]\n  \\centering\n  \\begin{tabular}{|c|c|c|}\n    \\hline\n    Col 1 & Col 2 & Col 3 \\\\\\\\\n    \\hline\n    Data & Data & Data \\\\\\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Caption text}\n  \\label{tab:label}\n\\end{table}',
          }),
      },
    ],
  }

  const themeGroup: CommandGroupEntry = {
    heading: 'Theme',
    commands: [
      {
        id: 'theme-light',
        label: 'Light Theme',
        icon: <Sun className="size-4" />,
        action: () => setTheme('light'),
      },
      {
        id: 'theme-dark',
        label: 'Dark Theme',
        icon: <Moon className="size-4" />,
        action: () => setTheme('dark'),
      },
      {
        id: 'theme-system',
        label: 'System Theme',
        icon: <Monitor className="size-4" />,
        action: () => setTheme('system'),
      },
    ],
  }

  // Build the list of groups; editor + latex only shown on editor pages
  const groups: CommandGroupEntry[] = [navigationGroup]
  if (isEditorPage) {
    groups.push(editorGroup, latexGroup)
  }
  groups.push(themeGroup)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.heading}>
            {groupIndex > 0 && <CommandSeparator />}
            <CommandGroup heading={group.heading}>
              {group.commands.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={cmd.label}
                  onSelect={() => runCommand(cmd.action)}
                >
                  {cmd.icon}
                  <span>{cmd.label}</span>
                  {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
