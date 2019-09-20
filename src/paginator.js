const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_LIMIT = 100;
const DEFAULT_NO_MAX_LIMIT = false;

export default async (Model, options = {}) => {
  Model.getApp((error, app) => {
    if (error) {
      console.error(`Error getting app: ${error}`);
    }
    
    let globalOptions = app.get('paginator') || {};
    options.limit = options.limit || globalOptions.limit || DEFAULT_LIMIT;
    options.maxLimit = options.maxLimit || globalOptions.maxLimit || DEFAULT_MAX_LIMIT;
    options.noMaxLimit = options.noMaxLimit || globalOptions.noMaxLimit || DEFAULT_NO_MAX_LIMIT;
  });

  Model.beforeRemote('find', async (context) => {
    if (!context.args.filter.page) { return; }

    context.args.filter = modifyFilter(context.args.filter);
  });

  Model.afterRemote('find', async (context) => {
    if (!context.args.filter.page) { return; }

    const limit = getLimit(context.args.filter);
    const where = context.args.filter.where || null;
    const totalItemCount = await Model.count(where);
    const totalPageCount = Math.ceil(totalItemCount / limit);
    const currentPage = parseInt(context.args.filter.page) || 1;
    const previousPage = currentPage - 1;
    const nextPage = currentPage + 1;

    context.result = {
      data: context.result,
      meta: {
        totalItemCount: totalItemCount,
        totalPageCount: totalPageCount,
        itemsPerPage: limit,
        currentPage: currentPage,
      }
    };

    if (nextPage <= totalPageCount) {
      context.result.meta.nextPage = nextPage;
    }

    if (previousPage > 0) {
      context.result.meta.previousPage = previousPage;
    }
  });

  function modifyFilter(filter) {
    const limit = getLimit(filter);
    const skip = (filter.page - 1) * limit;

    if (!filter) {
      filter = {
        skip: skip,
        limit: limit,
      };
      return filter;
    }

    filter.skip = skip;
    filter.limit = limit;

    return filter;
  }

  function getLimit(filter) {
    if (filter && filter.limit) {
      let limit = parseInt(filter.limit);

      if (options.maxLimit && !options.noMaxLimit) {
        limit = limit > options.maxLimit ? options.maxLimit : limit;
      }

      return limit;
    }
  
    return options.limit;
  }

};

module.exports = exports.default;
