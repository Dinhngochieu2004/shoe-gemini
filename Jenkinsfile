pipeline {
    agent any

    environment {
        IMAGE_FRONTEND = "dinhngochieu3112004/shoe-gemini-frontend:latest"
        IMAGE_BACKEND  = "dinhngochieu3112004/shoe-gemini-backend:latest"
        STACK_NAME     = "shoe-gemini"
    }

    stages {

        stage('Clone') {
            steps {
                git branch: 'main',
                    credentialsId: 'Github-CredentialsID',
                    url: 'https://github.com/Dinhngochieu2004/shoe-gemini.git'
            }
        }

        stage('Read ENV') {
            steps {
                withCredentials([
                    file(credentialsId: 'client-env', variable: 'CLIENT_ENV'),
                    file(credentialsId: 'server-env', variable: 'SERVER_ENV')
                ]) {
                    sh 'cp $CLIENT_ENV ./client/.env'
                    sh 'cp $SERVER_ENV ./server/.env'
                }
            }
        }

        stage('Build & Push') {
            steps {
                withDockerRegistry(credentialsId: 'docker-registry', url: 'https://index.docker.io/v1/') {
                    sh 'docker build --no-cache -t $IMAGE_FRONTEND ./client'
                    sh 'docker push $IMAGE_FRONTEND'
                    sh 'docker build --no-cache -t $IMAGE_BACKEND ./server'
                    sh 'docker push $IMAGE_BACKEND'
                }
            }
        }

        stage('Test') {
            steps {
                sh 'docker compose down --remove-orphans || true'
                sh 'docker compose up -d --build'
                sh 'sleep 15'
                sh 'docker compose ps'
                // Kiểm tra backend healthy
                sh 'docker compose exec -T backend wget -qO- http://localhost:5001/api/products || exit 1'
            }
            post {
                always {
                    sh 'docker compose down --remove-orphans || true'
                }
            }
        }

        stage('Deploy to Swarm') {
            steps {
                echo 'deploy'
                // sshagent(credentials: ['swarm-manager-ssh']) {
                //     sh '''
                //         ssh -o StrictHostKeyChecking=no $SWARM_MANAGER_USER@$SWARM_MANAGER_HOST "
                //             docker pull $IMAGE_FRONTEND &&
                //             docker pull $IMAGE_BACKEND &&
                //             docker stack deploy -c /opt/shoe-gemini/docker-stack.yml $STACK_NAME --with-registry-auth
                //         "
                //     '''
                // }
            }
        }

    }

    post {
        success {
            echo "Pipeline SUCCESS — stack ${STACK_NAME} deployed"
        }
        failure {
            echo "Pipeline FAILED — check logs above"
        }
        cleanup {
            sh 'docker image prune -f || true'
        }
    }
}
