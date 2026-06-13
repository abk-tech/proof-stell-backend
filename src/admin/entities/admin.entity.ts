export class Admin {


    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;   

    @Column({ type: 'varchar', length: 255, nullable: false })
    email: string;
}
