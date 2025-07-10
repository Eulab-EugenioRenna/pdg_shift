import type { SVGProps } from "react"
import { Church } from "lucide-react"

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => <Church {...props} />,
  google: (props: SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" fill="currentColor" {...props}>
      <path d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.2 109.8 8.4 244 8.4c69.1 0 128.8 28.2 172.4 72.3l-63.7 61.9C320.4 112.3 287.4 97.2 244 97.2c-74.2 0-134.4 60.2-134.4 134.4s60.2 134.4 134.4 134.4c83.8 0 119.3-61.2 122.7-92.4H244v-79.2h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  )
}
