import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateBlogForm } from '@/components/CreateBlogForm'
import { useNavigate } from '../../navigation/RouterContext'
import { PATHS, blogDetailsPath } from '../../navigation/paths'

// Admin Portal -> Blogs -> Create New Blog
export function CreateBlogPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => navigate(PATHS.ADMIN_BLOGS)}
        className="self-start px-3.5 py-1.5 text-xs font-medium shadow-2xs"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5 text-muted-foreground" />
        <span>Back to blogs</span>
      </Button>

      <h1 className="mt-6 font-serif text-3xl font-normal tracking-tight text-foreground">
        Create New Blog
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Write the post, choose who can read it, then publish or save it as a draft.
      </p>

      <div className="mt-8">
        <CreateBlogForm
          onCancel={() => navigate(PATHS.ADMIN_BLOGS)}
          // Published posts open on the site; drafts aren't public, so go back to the list.
          onCreated={({ slug, status }) =>
            navigate(status === 'published' ? blogDetailsPath(slug) : PATHS.ADMIN_BLOGS)
          }
        />
      </div>
    </div>
  )
}
