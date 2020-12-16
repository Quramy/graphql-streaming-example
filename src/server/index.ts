import path from 'path';
import express from 'express';
import { ServerResponse } from 'http';
import { DocumentNode, parse, validate, execute } from 'graphql';
import { schema } from '../schema';

function isAsyncIterable(x: any): x is AsyncIterableIterator<any> {
  return x != null && typeof x === 'object' && x[Symbol.asyncIterator];
}

const BOUNDARY = '-';
const CRLF = '\r\n';

const app = express();

app.use(express.static(path.resolve(__dirname, '../../public')));
app.use(express.json());

app.post('/graphql', async (req, res) => {
  const { query, variables } = req.body;
  if (typeof query !== 'string') {
    res
      .json({ errors: [{ message: 'query must be string' }] })
      .status(400)
      .end();
    return;
  }

  let document: DocumentNode | undefined = undefined;
  try {
    document = parse(query);
  } catch (e) {
    res
      .json({ errors: [{ message: 'parse error' }] })
      .status(400)
      .end();
    return;
  }
  const gqlErrors = validate(schema, document!);
  if (gqlErrors.length > 0) {
    res
      .json({ errors: gqlErrors.map(({ message, locations, name }) => ({ message, locations, name })) })
      .status(400)
      .end();
    return;
  }
  try {
    const result = await execute({
      schema,
      document,
      variableValues: variables ?? {},
    });
    if (isAsyncIterable(result)) {
      res.writeHead(200, {
        'Content-Type': `multipart/mixed; charset=UTF-8; boundary="${BOUNDARY}"`,
        'Transfer-Encoding': 'chunked',
      });
      res.write(CRLF + CRLF + `--${BOUNDARY}`);
      for await (const payloadObj of result) {
        const payloadBody = JSON.stringify(payloadObj);
        // prettier-ignore
        const multipart = CRLF
                        + 'Content-Type: application/json; charset=UTF-8' + CRLF
                        + `Content-Length: ${payloadBody.length}` + CRLF
                        + CRLF
                        + payloadBody
                        + CRLF
                        + CRLF
                        + `--${BOUNDARY}`
        res.write(multipart);
        // @ts-expect-error
        typeof res.flush === 'function' && res.flush !== ServerResponse.prototype.flush && res.flush();
      }
      res.write('--' + CRLF);
      res.end();
    } else {
      res.json(result).end();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal server error';
    return res
      .json({ errors: [{ message }] })
      .status(500)
      .end();
  }
});

app.listen(4010, () => {
  console.log('GraphQL server started. http://localhost:4010/graphql');
});
