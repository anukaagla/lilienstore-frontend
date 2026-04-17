type SearchParamsLike = {
  toString: () => string;
};

type BuildCategoryHrefOptions = {
  slug?: string | null;
  catalogBasePath?: string;
  pathname?: string | null;
  searchParams?: SearchParamsLike | null;
};

export const buildCategoryHref = ({
  slug,
  catalogBasePath = "/market",
  pathname,
  searchParams,
}: BuildCategoryHrefOptions) => {
  const normalizedSlug = slug?.trim() ?? "";
  if (!normalizedSlug) {
    return catalogBasePath;
  }

  const params =
    pathname === catalogBasePath
      ? new URLSearchParams(searchParams?.toString())
      : new URLSearchParams();

  params.set("category", normalizedSlug);
  params.delete("search");

  const query = params.toString();
  return query ? `${catalogBasePath}?${query}` : catalogBasePath;
};
