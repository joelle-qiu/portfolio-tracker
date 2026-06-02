import { useRef } from 'react'

interface ImportButtonProps {
  isImporting: boolean
  onImport: (file: File) => Promise<void>
}

export function ImportButton({ isImporting, onImport }: ImportButtonProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelectFile = (): void => {
    inputRef.current?.click()
  }

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    await onImport(file)
    event.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSelectFile}
        disabled={isImporting}
        className="border border-[var(--color-border)] bg-white px-3 py-1 text-sm text-[#333333] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isImporting ? '导入中...' : '导入 Excel'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          void handleChange(event)
        }}
      />
    </>
  )
}

