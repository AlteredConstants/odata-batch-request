/// <reference path="./types.d.ts" />

import { afterEach, expect, jest, test } from "@jest/globals";
import {
	ODataBatchChangeset,
	ODataBatchOperation,
	ODataBatchRequest,
} from "../src/index";
import response from "./response.txt";
import responseChangesetError from "./response-changeset-error.txt";

afterEach(() => {
	jest.restoreAllMocks();
});

test("Get full GET batch request", () => {
	jest
		.spyOn(crypto, "randomUUID")
		.mockReturnValue("526e0039-97fb-44d1-8313-1f019640c3d2");

	const batch = new ODataBatchRequest("host/service", [
		new ODataBatchOperation("get", "Customers('ALFKI')"),
		new ODataBatchOperation("get", "Products"),
	]);

	expect(batch.toString()).toMatchInlineSnapshot(`
		"POST host/service/$batch HTTP/1.1
		OData-Version: 4.0
		Content-Type: multipart/mixed; boundary=batch_526e0039-97fb-44d1-8313-1f019640c3d2
		Accept: multipart/mixed

		--batch_526e0039-97fb-44d1-8313-1f019640c3d2
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		GET Customers('ALFKI') HTTP/1.1


		--batch_526e0039-97fb-44d1-8313-1f019640c3d2
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		GET Products HTTP/1.1


		--batch_526e0039-97fb-44d1-8313-1f019640c3d2--"
	`);
});

test("Get full GET and POST batch request", () => {
	jest
		.spyOn(crypto, "randomUUID")
		.mockReturnValue("5d680fd1-3097-416a-a485-b7538f2ee802");

	const batch = new ODataBatchRequest("host/service", [
		new ODataBatchOperation("get", "Customers('ALFKI')"),
		new ODataBatchOperation("post", "Customers", {
			headers: { "Content-Type": "application/atom+xml;type=entry" },
			body: "<AtomPub representation of a new Customer>",
		}),
	]);

	expect(batch.toString()).toMatchInlineSnapshot(`
		"POST host/service/$batch HTTP/1.1
		OData-Version: 4.0
		Content-Type: multipart/mixed; boundary=batch_5d680fd1-3097-416a-a485-b7538f2ee802
		Accept: multipart/mixed

		--batch_5d680fd1-3097-416a-a485-b7538f2ee802
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		GET Customers('ALFKI') HTTP/1.1


		--batch_5d680fd1-3097-416a-a485-b7538f2ee802
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		POST Customers HTTP/1.1
		Content-Type: application/atom+xml;type=entry

		<AtomPub representation of a new Customer>
		--batch_5d680fd1-3097-416a-a485-b7538f2ee802--"
	`);
});

test("Get full changeset batch request", () => {
	jest
		.spyOn(crypto, "randomUUID")
		// Changeset boundary.
		.mockReturnValueOnce("abe49c47-d879-4844-8e89-1a37e06e5f5a")
		// Batch boundary.
		.mockReturnValueOnce("96b943fe-ddf2-4964-a506-b1dbb2343c4e");

	const changeset = new ODataBatchChangeset([
		new ODataBatchOperation("post", "Customers", {
			headers: { "Content-Type": "application/atom+xml;type=entry" },
			body: "<AtomPub representation of a new Customer>",
		}),
		new ODataBatchOperation("patch", "Customers('ALFKI')", {
			headers: { "Content-Type": "application/json" },
			body: "<JSON representation of Customer ALFKI>",
		}),
	]);

	const batch = new ODataBatchRequest("host/service", [
		new ODataBatchOperation("get", "Customers('ALFKI')"),
		changeset,
		new ODataBatchOperation("get", "Products"),
	]);

	expect(batch.toString()).toMatchInlineSnapshot(`
		"POST host/service/$batch HTTP/1.1
		OData-Version: 4.0
		Content-Type: multipart/mixed; boundary=batch_96b943fe-ddf2-4964-a506-b1dbb2343c4e
		Accept: multipart/mixed

		--batch_96b943fe-ddf2-4964-a506-b1dbb2343c4e
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		GET Customers('ALFKI') HTTP/1.1


		--batch_96b943fe-ddf2-4964-a506-b1dbb2343c4e
		Content-Type: multipart/mixed; boundary=changeset_abe49c47-d879-4844-8e89-1a37e06e5f5a

		--changeset_abe49c47-d879-4844-8e89-1a37e06e5f5a
		Content-ID: 1
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		POST Customers HTTP/1.1
		Content-Type: application/atom+xml;type=entry

		<AtomPub representation of a new Customer>
		--changeset_abe49c47-d879-4844-8e89-1a37e06e5f5a
		Content-ID: 2
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		PATCH Customers('ALFKI') HTTP/1.1
		Content-Type: application/json

		<JSON representation of Customer ALFKI>
		--changeset_abe49c47-d879-4844-8e89-1a37e06e5f5a--
		--batch_96b943fe-ddf2-4964-a506-b1dbb2343c4e
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		GET Products HTTP/1.1


		--batch_96b943fe-ddf2-4964-a506-b1dbb2343c4e--"
	`);
});

test("Get full changeset with reference batch request", () => {
	jest
		.spyOn(crypto, "randomUUID")
		// Changeset boundary.
		.mockReturnValueOnce("910e6609-2966-4820-936f-620c3ef65769")
		// Batch boundary.
		.mockReturnValueOnce("5d62dacb-db8a-49d2-af74-83d97a5015a5");

	const customerPost = new ODataBatchOperation("post", "Customers", {
		headers: { "Content-Type": "application/atom+xml;type=entry" },
		body: "<AtomPub representation of a new Customer>",
	});
	const orderPost = new ODataBatchOperation("post", "Orders", {
		headers: { "Content-Type": "application/atom+xml;type=entry" },
		body: "<AtomPub representation of a new Order>",
	});
	const orderReferencePost = new ODataBatchOperation(
		"post",
		[customerPost, "Orders/$ref"],
		{
			headers: { "Content-Type": "application/json" },
			body: (getReference) => `{"$id":"${getReference?.(orderPost)}"}`,
		},
	);

	const changeset = new ODataBatchChangeset([
		customerPost,
		orderPost,
		orderReferencePost,
	]);

	const batch = new ODataBatchRequest("host/service", [changeset]);

	expect(batch.toString()).toMatchInlineSnapshot(`
		"POST host/service/$batch HTTP/1.1
		OData-Version: 4.0
		Content-Type: multipart/mixed; boundary=batch_5d62dacb-db8a-49d2-af74-83d97a5015a5
		Accept: multipart/mixed

		--batch_5d62dacb-db8a-49d2-af74-83d97a5015a5
		Content-Type: multipart/mixed; boundary=changeset_910e6609-2966-4820-936f-620c3ef65769

		--changeset_910e6609-2966-4820-936f-620c3ef65769
		Content-ID: 1
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		POST Customers HTTP/1.1
		Content-Type: application/atom+xml;type=entry

		<AtomPub representation of a new Customer>
		--changeset_910e6609-2966-4820-936f-620c3ef65769
		Content-ID: 2
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		POST Orders HTTP/1.1
		Content-Type: application/atom+xml;type=entry

		<AtomPub representation of a new Order>
		--changeset_910e6609-2966-4820-936f-620c3ef65769
		Content-ID: 3
		Content-Type: application/http
		Content-Transfer-Encoding: binary

		POST $1/Orders/$ref HTTP/1.1
		Content-Type: application/json

		{"$id":"$2"}
		--changeset_910e6609-2966-4820-936f-620c3ef65769--
		--batch_5d62dacb-db8a-49d2-af74-83d97a5015a5--"
	`);
});

test("Parse full batch response", () => {
	const customerGet = new ODataBatchOperation("get", "Customers('ALFKI')");
	const customerPost = new ODataBatchOperation("post", "Customers", {
		headers: { "Content-Type": "application/atom+xml;type=entry" },
		body: "<AtomPub representation of a new Customer>",
	});
	const customerPatch = new ODataBatchOperation("patch", "Customers('ALFKI')", {
		headers: { "Content-Type": "application/json" },
		body: "<JSON representation of Customer ALFKI>",
	});
	const productsGet = new ODataBatchOperation("get", "Products");

	const batch = new ODataBatchRequest("host/service", [
		customerGet,
		new ODataBatchChangeset([customerPost, customerPatch] as const),
		productsGet,
	] as const);

	const parsed = batch.parseResponse(
		response,
		"multipart/mixed;boundary=b_243234_25424_ef_892u748",
	);

	expect(parsed).toEqual({
		hasError: true,
		operations: [
			{
				operation: customerGet,
				status: 200,
				body: '{ "value": "JSON representation of the Customer entity with EntityKey ALFKI" }',
			},
			[
				{
					operation: customerPost,
					status: 201,
					body: "<AtomPub representation of a new Customer entity>",
				},
				{ operation: customerPatch, status: 204, body: "" },
			],
			{ operation: productsGet, status: 404, body: "<Error message>" },
		],
	});
});

test("Parse batch response with error in changeset", () => {
	const customerGet = new ODataBatchOperation("get", "Customers('ALFKI')");
	const changeset = new ODataBatchChangeset([
		new ODataBatchOperation("post", "Customers", {
			headers: { "Content-Type": "application/atom+xml;type=entry" },
			body: "<AtomPub representation of a new Customer>",
		}),
		new ODataBatchOperation("patch", "Customers('ALFKI')", {
			headers: { "Content-Type": "application/json" },
			body: "<JSON representation of Customer ALFKI>",
		}),
	] as const);
	const productsGet = new ODataBatchOperation("get", "Products");

	const batch = new ODataBatchRequest("host/service", [
		customerGet,
		changeset,
		productsGet,
	] as const);

	const parsed = batch.parseResponse(
		responseChangesetError,
		"multipart/mixed;boundary=b_243234_25424_ef_892u748",
	);

	expect(parsed).toEqual({
		hasError: true,
		operations: [
			{
				operation: customerGet,
				status: 200,
				body: '{ "value": "JSON representation of the Customer entity with EntityKey ALFKI" }',
			},
			{ changeset, status: 403, body: "<Error message>" },
			{ operation: productsGet, status: 404, body: "<Error message>" },
		],
	});
});
