import type { StudentDetection } from '../types/attention'
import { AttentionState } from '../types/attention'
import { STATE_COLORS, STATE_LABELS, EMOTION_ICONS } from '../constants/thresholds'

interface Props {
  students: StudentDetection[]
}

const STATE_ICONS: Record<AttentionState, string> = {
  [AttentionState.Working]: 'OK',
  [AttentionState.Watching]: 'ON',
  [AttentionState.Distracted]: '!',
  [AttentionState.Absent]: '--',
}

export function StudentGrid({ students }: Props) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 h-full flex flex-col">
      <h2 className="text-white font-semibold text-xs uppercase tracking-wide mb-2 flex-shrink-0">
        Students{students.length > 0 && <span className="text-gray-400 font-normal ml-1">({students.length})</span>}
      </h2>

      {students.length === 0 ? (
        <p className="text-gray-500 text-xs text-center py-4">No faces detected.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 overflow-y-auto">
          {students.map((student) => (
            <StudentCard key={student.stableId} student={student} />
          ))}
        </div>
      )}
    </div>
  )
}

function StudentCard({ student }: { student: StudentDetection }) {
  const { stableId, state, pose, emotion } = student
  const color = STATE_COLORS[state]
  const stateLabel = STATE_LABELS[state]

  return (
    <div
      className="rounded-lg p-1.5 flex flex-col items-center gap-0.5 border transition-colors duration-300"
      style={{ borderColor: `${color}88`, backgroundColor: `${color}18` }}
      title={`State: ${stateLabel}`}
    >
      <div
        className="w-8 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border"
        style={{ borderColor: color, color }}
      >
        {STATE_ICONS[state]}
      </div>
      <span className="text-white text-xs font-mono leading-none">#{stableId + 1}</span>
      <span className="text-xs leading-none text-gray-300" title={`Emotion: ${emotion}`}>
        {EMOTION_ICONS[emotion] ?? ':|'}
      </span>
      {pose && (
        <span className="text-gray-500 font-mono leading-none text-[10px]" title={`Pitch: ${Math.round(pose.pitch)} deg`}>
          {Math.round(pose.pitch)} deg
        </span>
      )}
    </div>
  )
}
