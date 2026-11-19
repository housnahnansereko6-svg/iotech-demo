import { CreateBlogForm } from '@/components/CreateBlogForm'
import { useNavigate } from '../../navigation/RouterContext'
import { PATHS, blogDetailsPath } from '../../navigation/paths'

// Admin Portal -> Blogs -> Create Blog
export function CreateBlogPage() {
  const navigate = useNavigate()

  return (
    <CreateBlogForm
      // Published posts open on the site; drafts aren't public, so go back to the list.
      onCreated={({ slug, status }) =>
        navigate(status === 'published' ? blogDetailsPath(slug) : PATHS.ADMIN_BLOGS)
      }
    />
  )
}
