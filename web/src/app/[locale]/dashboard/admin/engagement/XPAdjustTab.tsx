'use client'

import { useState, memo } from 'react'
import { useTranslations } from 'next-intl'
import { RecalculationResultDto, RecalculationUserResult } from '@crabwatch/shared'

export const XPAdjustTab = memo((props: {
  adjUserId: string; setAdjUserId: (v: string) => void; adjDeltaXP: number; setAdjDeltaXP: (v: number) => void;
  adjReason: string; setAdjReason: (v: string) => void; adjLoading: boolean;
  recalcMode: 'dry-run' | 'execute'; setRecalcMode: (v: 'dry-run' | 'execute') => void;
  recalcUserId: string; setRecalcUserId: (v: string) => void; recalcReason: string; setRecalcReason: (v: string) => void;
  recalcLoading: boolean; recalcResults: RecalculationResultDto | null;
  recalcJobId: string | null; recalcJobStatus: { status: string; processed?: number; updatedAt?: Date } | null;
  onAdjust: () => void; onRecalculate: () => void; onCheckJob: (jobId: string) => void;
}) => {
  const tAdj = useTranslations('admin.engagement.adjustments')
  const tRecalc = useTranslations('admin.engagement.recalculation')
  const tAdmin = useTranslations('admin')
  const { adjUserId, setAdjUserId, adjDeltaXP, setAdjDeltaXP, adjReason, setAdjReason, adjLoading,
    recalcMode, setRecalcMode, recalcUserId, setRecalcUserId, recalcReason, setRecalcReason,
    recalcLoading, recalcResults, recalcJobId, recalcJobStatus, onAdjust, onRecalculate, onCheckJob } = props
  const [checkJobInput, setCheckJobInput] = useState('')
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-ocean-800 mb-4">{tAdj('title')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tAdj('userId')}</label>
            <input type="text" value={adjUserId} onChange={(e) => setAdjUserId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tAdj('selectUser')} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tAdj('amount')}</label>
            <input type="number" value={adjDeltaXP} onChange={(e) => setAdjDeltaXP(parseInt(e.target.value) || 0)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tAdj('reason')}</label>
            <input type="text" value={adjReason} onChange={(e) => setAdjReason(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tAdj('reasonPlaceholder')} />
          </div>
          <button onClick={onAdjust} disabled={adjLoading}
            className="w-full bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm disabled:opacity-50">
            {adjLoading ? tAdj('adjusting') : tAdj('adjust')}
          </button>
        </div>
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-ocean-800 mb-4">{tRecalc('title')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tRecalc('mode')}</label>
            <select value={recalcMode} onChange={(e) => setRecalcMode(e.target.value as 'dry-run' | 'execute')}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="dry-run">{tRecalc('dryRun')}</option>
              <option value="execute">{tRecalc('execute')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tRecalc('userIdOptional')}</label>
            <input type="text" value={recalcUserId} onChange={(e) => setRecalcUserId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tRecalc('allUsersPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{tRecalc('reason')}</label>
            <input type="text" value={recalcReason} onChange={(e) => setRecalcReason(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder={tRecalc('reasonPlaceholder')} />
          </div>
          <button onClick={onRecalculate} disabled={recalcLoading}
            className="w-full bg-ocean-600 text-white px-4 py-2 rounded-lg hover:bg-ocean-700 text-sm disabled:opacity-50">
            {recalcLoading ? tRecalc('running') : tRecalc('recalculate')}
          </button>
        </div>
{recalcResults && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <div className="font-medium mb-2">{tRecalc('results')}:</div>
              <div className="text-gray-600">{tRecalc('mode')}: {recalcResults.mode} | {tRecalc('users')}: {recalcResults.totalUsers}</div>
              {recalcResults.results?.slice(0, 5).map((r: RecalculationUserResult) => {
                const diffStr = r.diff >= 0 ? '+' + r.diff : String(r.diff)
                const arrow = ' \u2192 '
                return (
                  <div key={r.userId} className="text-xs text-gray-500 mt-1">
                    {r.userId}: {r.currentXP}{arrow}{r.correctXP} ({tRecalc('diff')}: {diffStr})
                  </div>
                )
              })}
            </div>
          )}

          {/* Job Status Monitor */}
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div className="font-medium mb-2">{tRecalc('jobStatus')}</div>
            <div className="flex gap-2 mb-3">
              <input type="text" value={checkJobInput} onChange={(e) => setCheckJobInput(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-xs" placeholder={tRecalc('enterJobId')} />
              <button onClick={() => checkJobInput && onCheckJob(checkJobInput)}
                className="text-xs bg-ocean-600 text-white px-3 py-1 rounded">{tRecalc('check')}</button>
            </div>
            {recalcJobStatus && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${recalcJobStatus.status === 'running' ? 'bg-blue-500 animate-pulse' : recalcJobStatus.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium capitalize">{recalcJobStatus.status === 'running' ? tRecalc('statusRunning') : recalcJobStatus.status === 'completed' ? tRecalc('statusCompleted') : tRecalc('statusFailed')}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {tRecalc('usersProcessed', { processed: recalcJobStatus.processed ?? 0 })}
                  </span>
                </div>
                {recalcJobId && (
                  <div className="text-xs text-gray-400 font-mono truncate">ID: {recalcJobId}</div>
                )}
               <div className="text-xs text-gray-400">
                    {tRecalc('updated')}: {recalcJobStatus.updatedAt ? new Date(recalcJobStatus.updatedAt).toLocaleTimeString() : '\u2014'}
                  </div>
              </div>
            )}
          </div>
      </div>
    </div>
  )
})
XPAdjustTab.displayName = 'XPAdjustTab'
