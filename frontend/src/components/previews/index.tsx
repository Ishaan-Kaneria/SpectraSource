import type * as C from '../../lib/content'
import type { Artifact, Job } from '../../types'
import { AdvisoryPreview, SummaryPreview } from './DocumentPreview'
import { InfographicPreview } from './InfographicPreview'
import { PresentationPreview } from './PresentationPreview'
import { LinkedInPreview, TwitterPreview } from './SocialPreview'
import { VideoPreview } from './VideoPreview'

export function Preview({ artifact, job }: { artifact: Artifact; job: Job }) {
  const c = artifact.content as unknown
  switch (artifact.output_type) {
    case 'presentation':
      return <PresentationPreview value={c as C.Presentation} />
    case 'twitter':
      return <TwitterPreview value={c as C.TwitterThread} />
    case 'linkedin':
      return <LinkedInPreview value={c as C.LinkedInPost} />
    case 'video':
      return <VideoPreview value={c as C.VideoPackage} />
    case 'infographic':
      return <InfographicPreview value={c as C.Infographic} />
    case 'advisory':
      return <AdvisoryPreview value={c as C.Advisory} createdAt={job.created_at} />
    case 'executive_summary':
      return <SummaryPreview value={c as C.ExecutiveSummary} params={job.params} createdAt={job.created_at} />
  }
}
