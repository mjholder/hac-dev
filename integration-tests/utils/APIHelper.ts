import { githubAPIEndpoints } from './APIEndpoints';

export class APIHelper {
  static readonly githubHeaders = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${Cypress.env('GH_TOKEN')}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  static requestHACAPI(options: Partial<Cypress.RequestOptions>) {
    const oidcUser = JSON.parse(
      localStorage.getItem(`oidc.user:${Cypress.env('SSO_URL')}:cloud-services`),
    );
    const token = oidcUser.access_token as string;

    options.headers = {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    };

    return cy.request(options);
  }

  static githubRequest(method: Cypress.HttpMethod, url: string, body?: Cypress.RequestBody) {
    const options: Partial<Cypress.RequestOptions> = {
      method,
      url,
      headers: this.githubHeaders,
    };
    if (body) {
      options.body = body;
    }
    return cy.request(options);
  }

  static checkResponseBodyAndStatusCode(
    url: string,
    responseBodyContent: string,
    waitInterval: number = 2000,
    retryNum: number = 0,
    maxRetryNum: number = 10,
    headers?: object,
  ) {
    expect(retryNum).to.be.lessThan(maxRetryNum);
    const options: Partial<Cypress.RequestOptions> = {
      url,
      timeout: 30000,
      failOnStatusCode: false,
    };
    if (headers) {
      options.headers = headers;
    }
    cy.request(options).then((resp) => {
      if (resp.status === 200 && JSON.stringify(resp.body).includes(responseBodyContent) === true) {
        cy.log(
          `The response body of URL: ${url}, now contains the content: ${responseBodyContent}`,
        );
        return;
      }

      cy.log('The response body of URL doesnt contain the expected content yet, retrying...');
      cy.wait(waitInterval);
      this.checkResponseBodyAndStatusCode(
        url,
        responseBodyContent,
        waitInterval,
        retryNum + 1,
        maxRetryNum,
        headers,
      );
    });
  }

  static createGitHubRepository(repoName: string) {
    const body = { name: repoName };
    this.githubRequest('POST', githubAPIEndpoints.orgRepos, body);
    this.checkResponseBodyAndStatusCode(
      githubAPIEndpoints.qeRepos(repoName),
      `"name":"${repoName}"`,
      2000,
      0,
      3,
      this.githubHeaders,
    );
  }

  static deleteGitHubRepository(repoName: string) {
    this.githubRequest('DELETE', githubAPIEndpoints.qeRepos(repoName));
  }

  static createRepositoryFromTemplate(
    templateOwner: string,
    templateRepoName: string,
    targetOwner: string,
    targetRepoName: string,
  ) {
    const body = {
      owner: targetOwner,
      name: targetRepoName,
    };
    this.githubRequest(
      'POST',
      githubAPIEndpoints.templateRepo(templateOwner, templateRepoName),
      body,
    );
  }
}
