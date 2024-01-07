# vectordb-js-lambda-layer

This repo acts as a small demo to showcase how to use the [vectordb](https://www.npmjs.com/package/vectordb) JS package (i.e. the JS SDK for [LanceDB](https://lancedb.com/)) with AWS Lambda functions deployed using the [Serverless framework](https://www.serverless.com/) and the [esbuild](https://esbuild.github.io/) bundler (through the [serverless-esbuild](https://www.npmjs.com/package/serverless-esbuild) plugin).

In this repo, we

- Provide an example `serverless.yml` file and corresponding code to deploy a Lambda function with the Serverless framework and `serverless-esbuild` (this can be found in the `deployment-example` folder)
- Provide a .zip of a Lambda layer for `vector-db` (version 0.4.2) needed for the Lambda to properly use `vector-db`
- Explain shortly (in this README) how we made this .zip, and how we can then use it as a Lambda layer
- Explain further some details of this approach and how it could be improved/extended

## Creating & using the layer (high-level process)

There are 3 big steps we followed:

1. Packaging the layer content: we started an [AWS Cloud9](https://aws.amazon.com/cloud9/) instance, where we copied the content of the `layer/nodejs` folder, in which we then ran `npm install`, then zipped the resulting `nodejs` subfolder (with its `node_modules`) into `vectordb-layer-0.4.2.zip`, and finally downloaded this .zip
2. Creating the Lambda layer: following [this AWS tutorial](https://docs.aws.amazon.com/lambda/latest/dg/creating-deleting-layers.html), we uploaded the .zip to S3, and then manually created the layer in the Lambda console
3. Attaching the Lambda layer to a Lambda function: this is done automatically when deploying the example `serverless.yml`, through the `layers` property of the Lambda function in which we provide the ARN of the Lambda layer we created; however, to make it work with the `esbuild` bundler, **we also need to add `vectordb` as an external dependency** through the `custom.esbuild.external` property (see more details on external dependencies [here](https://github.com/floydspace/serverless-esbuild?tab=readme-ov-file#external-dependencies) - note that there are similar options for other bundlers like `webpack`)

## Some more details

### Why are we using the Serverless framework with `esbuild`?

The Serverless framework is a very nice tool for easy deployment of serverless micro-services & resources (like Lambda functions, S3 buckets or DynamoDB tables for AWS).

Using the `esbuild` bundler drastically reduces the size of the Lambdas we deploy, which means less deployment time, and also helps staying under the maximum size for Lambdas.

### Why are we using a Lambda layer for `vectordb`, instead of just bundling it with the other dependencies? Why are we using Cloud9 to build it?

The `vectordb` package comes with pre-built binaries for multiple platforms. In particular, if you're developing on MacOS, when installing `vectordb` with `npm install`, you will also install the `@lancedb/vectordb-darwin-x64` package, which corresponds to MacOS.

However, Lambda functions instead run on Linux machines. So, to make `vectordb` work on Lambda, we instead need the [@lancedb/vectordb-linux-x64-gnu](https://www.npmjs.com/package/@lancedb/vectordb-linux-x64-gnu) binary.

Unfortunately, if you're developing on MacOS or another platform that is not Linux, you simply cannot build/install this binary, unless you start a Docker container running on a Linux image.

Starting a container image for every deployment of the micro-service is possible but is a bit painful. A simple alternative is to build the Lambda layer once so that it includes `@lancedb/vectordb-linux-x64-gnu` (instead of other native binaries like `vectordb-darwin-x64`), and then attach it to your Lambda function which uses `vectordb`.

To build this layer with the right Linux binary, you still need to run `npm install` on a Linux machine/container. Using Cloud9 is just a simple way to do that (and is actually the recommended way to build Lambda layers in the official [AWS tutorial](https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html)). But we could also just use a local container, which would allow to automate the packaging of the layer content. In the future, we might switch to this approach.

### Why do we need to add `vectordb` as an external dependency for `esbuild`?

To know which native binary to run (for example, `@lancedb/vectordb-linux-x64-gnu` on Linux), `vectordb` uses a dynamic import logic (you can see it in the `native.js` file of `vectordb`).

Unfortunately, `esbuild` cannot resolve such dynamic imports, which are deemed non-analyzable (see [here](https://esbuild.github.io/api/#non-analyzable-imports)).

To fix this situation, we mark `vectordb` as an external dependency. In practice, it means that it won't be bundled like other dependencies (but will instead be deployed into the Lambda's `node_modules`), and the original import syntax will be preserved, meaning that `@lancedb/vectordb-linux-x64-gnu` will properly be imported (from the Lambda layer).

### Can we use this approach for future versions of `vectordb`? (beyond 0.4.2)

Completely. For this, you just need to update the versions of `vectordb` and `@lancedb/vectordb-linux-x64-gnu` in `layer/nodejs/package.json`, and start the process again (package the layer content -> upload it to S3 -> create the layer in Lambda -> attach it to your Lambda function).
