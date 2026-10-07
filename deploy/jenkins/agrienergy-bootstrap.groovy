// ============================================================
// Agri-Energy Desk — one-time Jenkins bootstrap (replaces the setup wizard)
//
// Installed by setup-prod.sh into /var/lib/jenkins/init.groovy.d/, which
// Jenkins runs on EVERY start. It only acts while its input file exists:
//
//   /var/lib/jenkins/agrienergy-bootstrap.properties   (jenkins:jenkins 600)
//     adminUser, adminPassword, jenkinsUrl, repoUrl,
//     credentialId, githubUser, githubToken
//
// and deletes that file once everything is in place, so the admin password
// and the GitHub token do not stay on disk in plain text (Jenkins keeps the
// token encrypted in its credential store). With the file gone, every later start is a no-op.
//
// Creates (each only if missing):
//   - admin user, login required for everything, no anonymous read
//   - username/token credential for GitHub over HTTPS. The NREP org disables
//     deploy keys, so this is a fine-grained, read-only, single-repo token.
//   - pipeline job `agrienergy-production` → Jenkinsfile on */production
// ============================================================

import com.cloudbees.plugins.credentials.CredentialsProvider
import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.common.StandardCredentials
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.GitSCM
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.security.HudsonPrivateSecurityRealm
import jenkins.install.InstallState
import jenkins.model.Jenkins
import jenkins.model.JenkinsLocationConfiguration
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import org.jenkinsci.plugins.workflow.job.WorkflowJob

def input = new File('/var/lib/jenkins/agrienergy-bootstrap.properties')
if (!input.exists()) {
    return
}

def p = new Properties()
input.withInputStream { p.load(it) }
def jenkins = Jenkins.get()

// ── Security: local users, login required ────────────────────────────
def realm = jenkins.getSecurityRealm()
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
    realm = new HudsonPrivateSecurityRealm(false)   // false = no self sign-up
    jenkins.setSecurityRealm(realm)
}
if (realm.getUser(p.adminUser) == null) {
    realm.createAccount(p.adminUser, p.adminPassword)
}
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
jenkins.setAuthorizationStrategy(strategy)

// Jenkins is on a public port: no inbound agent port (all builds run on
// this built-in node), no wizard.
jenkins.setSlaveAgentPort(-1)
jenkins.setInstallState(InstallState.INITIAL_SETUP_COMPLETED)

def location = JenkinsLocationConfiguration.get()
location.setUrl(p.jenkinsUrl)
location.save()

// ── GitHub access token ──────────────────────────────────────────────
def credentialId = p.credentialId
def existing = CredentialsProvider.lookupCredentials(StandardCredentials, jenkins, null, null)
        .find { it.id == credentialId }
if (existing == null) {
    def credential = new UsernamePasswordCredentialsImpl(
            CredentialsScope.GLOBAL, credentialId,
            'GitHub fine-grained token, read-only, NREP-Energy-Desk',
            p.githubUser, p.githubToken)
    SystemCredentialsProvider.getInstance().getStore().addCredentials(Domain.global(), credential)
}

// ── Pipeline job ─────────────────────────────────────────────────────
def jobName = 'agrienergy-production'
if (jenkins.getItem(jobName) == null) {
    def scm = new GitSCM(
            GitSCM.createRepoList(p.repoUrl, credentialId),
            [new BranchSpec('*/production')],
            null, null, [])
    def job = jenkins.createProject(WorkflowJob, jobName)
    job.setDescription('Production deploy of https://agrienergy.nrep.ug — see deploy/PRODUCTION.md')
    job.setDefinition(new CpsScmFlowDefinition(scm, 'Jenkinsfile'))
    job.save()
}

jenkins.save()

// Done: remove the plain-text inputs. setup-prod.sh waits for this file to
// disappear as its signal that the bootstrap succeeded.
input.delete()
println '[agrienergy-bootstrap] admin user, credential and job are in place'
