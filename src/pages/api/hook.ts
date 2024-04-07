import { NextApiRequest, NextApiResponse } from 'next';
import { PageRouterHighlight } from '@highlight-run/next/server';

const withPageRouterHighlight = PageRouterHighlight({
    projectID: '4d7w1pje',
});

import { handleNlpRequest } from '../../scenario/scenario';

export default withPageRouterHighlight(async (request: NextApiRequest, response: NextApiResponse) => {
    response.status(200).json(await handleNlpRequest(request.body));
});
