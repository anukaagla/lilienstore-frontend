import { Suspense } from "react";

import NotFoundNotice from "../../../components/not-found-notice";

export default function ProductNotFound() {
  // SiteHeader reads useSearchParams(); without a Suspense boundary the whole page
  // bails out of prerendering and ships an empty shell to crawlers.
  return (
    <Suspense fallback={null}>
      <NotFoundNotice variant="product" />
    </Suspense>
  );
}
