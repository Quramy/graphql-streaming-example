import path from 'path';
import express from 'express';
import { DocumentNode, parse, validate, graphql } from 'graphql';
import { schema } from '../schema';

const BOUNDARY = 'Boundary';

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

  let ast: DocumentNode | undefined = undefined;
  try {
    ast = parse(query);
  } catch (e) {
    res
      .json({ errors: [{ message: 'parse error' }] })
      .status(400)
      .end();
    return;
  }
  const gqlErrors = validate(schema, ast!);
  if (gqlErrors.length > 0) {
    res
      .json({ errors: gqlErrors.map(({ message, locations, name }) => ({ message, locations, name })) })
      .status(400)
      .end();
    return;
  }
  try {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables ?? {},
    });
    if ('next' in result) {
      res.writeHead(200, {
        'Content-Type': `multipart/mixed; charset=UTF-8; boundary="${BOUNDARY}"`,
        'Transfer-Encoding': 'chunked',
        Connection: 'keep-alive',
      });
      for await (const chunk of result) {
        const buffer = JSON.stringify(chunk);
        res.write(`\r\n\r\n--${BOUNDARY}\r\n`);
        res.write('Content-Type: application/json; charset=UTF-8\r\n');
        res.write(`Content-Length: ${buffer.length}\r\n\r\n`);
        res.write(buffer);
      }
      res.write(`\r\n--${BOUNDARY}--\r\n`);
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
