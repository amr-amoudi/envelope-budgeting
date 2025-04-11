export default async function fetchData<T>(
    url: string,
    requestObject?: { headers?: Record<string, string>; method: string; body?: string }
    ): Promise<T> {

    const response = await fetch(url, {
        method: requestObject?.method || "GET",
        headers: requestObject?.headers || { "Content-Type": "application/json" },
        body: requestObject?.body,
    });

    if(response.status === 204) {
        return null as T;
    }

    return response.json();
}
