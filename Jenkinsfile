// ============================================================
// Agri-Energy Desk — PRODUCTION pipeline (https://agrienergy.nrep.ug)
//
// Runs on the Jenkins instance on the production VM. Deploys ONLY the
// `production` branch. UAT (menu.smartcollect.co.ug) is untouched: it keeps
// pulling `main` through deploy/scripts/update-server.sh, and this pipeline
// never commits or pushes — it rebuilds the static export in its own
// workspace and ignores the copy committed for UAT.
//
// Promote to production:
//   git push origin1 main:production        (fast-forward)
//
// Roll back (code only — migrations stay applied):
//   Build with Parameters → ROLLBACK_TO=<release id>
//
// One-time server setup: deploy/scripts/provision-prod.sh, then
// deploy/scripts/setup-prod.sh (creates this job). Runbook: deploy/PRODUCTION.md
// ============================================================

pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    // Poll rather than webhook: nothing to configure on GitHub, and Jenkins
    // is plain HTTP on a bare IP. "Build Now" deploys immediately.
    triggers {
        pollSCM('H/5 * * * *')
    }

    parameters {
        string(name: 'ROLLBACK_TO', defaultValue: '',
               description: 'Release id (a previous build number) to switch back to. Blank = normal deploy.')
    }

    environment {
        // The ROOT-OWNED copy, not the workspace one — see release-prod.sh.
        RELEASE_SCRIPT = '/opt/agrienergy/bin/release-prod.sh'
    }

    stages {
        stage('Guard: production branch only') {
            steps {
                script {
                    // Pipeline-from-SCM jobs set GIT_BRANCH (origin/production);
                    // multibranch jobs set BRANCH_NAME (production).
                    def branch = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst(/^origin\//, '')
                    if (branch != 'production') {
                        error "Refusing to deploy branch '${branch}' — production deploys only from 'production'."
                    }
                    if (params.ROLLBACK_TO?.trim() && !(params.ROLLBACK_TO.trim() ==~ /\d+/)) {
                        error "ROLLBACK_TO must be a release id (a build number), got '${params.ROLLBACK_TO}'."
                    }
                }
            }
        }

        stage('Build frontend (static export)') {
            when { expression { !(params.ROLLBACK_TO?.trim()) } }
            steps {
                // Uses nvm + Node 20 from the jenkins user's home; verifies the
                // eight collection shells and installs the export into
                // api/public/static.
                sh 'bash deploy/scripts/build-static.sh'
            }
        }

        stage('Laravel dependencies') {
            when { expression { !(params.ROLLBACK_TO?.trim()) } }
            steps {
                dir('api') {
                    sh 'composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist'
                }
            }
        }

        stage('Release') {
            when { expression { !(params.ROLLBACK_TO?.trim()) } }
            steps {
                sh 'sudo -n -u agrienergy "$RELEASE_SCRIPT" "$WORKSPACE/api" "$BUILD_NUMBER"'
            }
        }

        stage('Rollback') {
            when { expression { (params.ROLLBACK_TO?.trim()) as boolean } }
            steps {
                sh 'sudo -n -u agrienergy "$RELEASE_SCRIPT" --rollback "$ROLLBACK_TO"'
            }
        }
    }

    post {
        success {
            echo "Live: https://agrienergy.nrep.ug (release ${params.ROLLBACK_TO?.trim() ?: env.BUILD_NUMBER})"
        }
        failure {
            echo 'Deploy failed. The previous release is still being served (release-prod.sh only switches after a clean build and reverts on failed smoke tests).'
        }
    }
}
